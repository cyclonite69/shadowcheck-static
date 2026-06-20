import 'dotenv/config';
import {
  getImportCompletenessReport,
  resumeImportRun,
  startImportRun,
} from '../server/src/services/wigleImportRunService';
import logger from '../server/src/logging/logger';
import { isProbeDispatchable, US_JURISDICTIONS } from '../server/src/constants/jurisdictions';

const SLEEP_BETWEEN_STATES_MS = 10 * 60 * 1000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface DaemonJurisdictionState {
  state: string;
  status?: string | null;
  resumable?: boolean;
  runId?: number | null;
}

/**
 * Builds the daemon queue from the canonical server-side jurisdiction list.
 * Unverified territories are never returned, including when an old report row
 * says that a run is resumable.
 */
export function buildDaemonJurisdictionQueue(
  reportStates: DaemonJurisdictionState[]
): DaemonJurisdictionState[] {
  const reportByCode = new Map<string, DaemonJurisdictionState>();
  for (const state of reportStates) {
    reportByCode.set(state.state.toUpperCase(), state);
  }

  return US_JURISDICTIONS.filter((jurisdiction) => isProbeDispatchable(jurisdiction.code))
    .map((jurisdiction) => {
      const existing = reportByCode.get(jurisdiction.code);
      return existing
        ? { ...existing, state: jurisdiction.code }
        : {
            state: jurisdiction.code,
            status: null,
            resumable: false,
            runId: null,
          };
    })
    .filter((state) => state.status !== 'completed');
}

export async function runDaemon(searchTerm: string) {
  logger.info(`🚀 Starting WiGLE Procurement Daemon for: "${searchTerm}"`);

  while (true) {
    try {
      // 1. Audit current progress across all states
      const report = await getImportCompletenessReport({ searchTerm });

      // 2. Find supported jurisdictions that are not completed. The report
      // only contains existing runs, so the canonical merge also creates work
      // items for supported jurisdictions that have not been queried yet.
      const incompleteStates = buildDaemonJurisdictionQueue(report.states);

      if (incompleteStates.length === 0) {
        logger.info('✅ All states completed for this search term. Daemon exiting.');
        break;
      }

      logger.info(`📊 Found ${incompleteStates.length} incomplete states. Starting processing...`);

      for (const stateInfo of incompleteStates) {
        const stateCode = stateInfo.state;

        try {
          if (stateInfo.resumable && stateInfo.runId) {
            logger.info(`🔄 Resuming run ${stateInfo.runId} for state ${stateCode}...`);
            await resumeImportRun(stateInfo.runId);
          } else {
            logger.info(`🆕 Starting new run for state ${stateCode}...`);
            await startImportRun({
              ssid: searchTerm,
              country: 'US',
              region: stateCode,
              resultsPerPage: 100,
            });
          }

          logger.info(`✅ Finished (or paused) state ${stateCode}.`);
        } catch (error: any) {
          if (error.status === 429) {
            logger.warn('⚠️ Hit WiGLE Rate Limit (429). Sleeping for 1 hour...');
            await sleep(60 * 60 * 1000);
            break; // Break the state loop to re-audit after sleep
          } else {
            logger.error(`❌ Error processing state ${stateCode}: ${error.message}`);
          }
        }

        await sleep(SLEEP_BETWEEN_STATES_MS);
      }
    } catch (error: any) {
      logger.error(`💥 Daemon encountered a fatal error: ${error.message}`);
      await sleep(60000); // Sleep a minute before retrying
    }
  }
}

if (require.main === module) {
  const searchTerm = process.argv[2];
  if (!searchTerm) {
    console.error('Usage: npx ts-node scripts/wigle-daemon.ts <search_term>');
    process.exit(1);
  }

  if (process.env.WIGLE_UNSAFE_BULK_DAEMON !== 'I_UNDERSTAND') {
    console.error(
      'Refusing to start scripts/wigle-daemon.ts without WIGLE_UNSAFE_BULK_DAEMON=I_UNDERSTAND. ' +
        'This script performs repeated multi-state WiGLE imports and matches bulk-harvesting patterns.'
    );
    process.exit(1);
  }

  void runDaemon(searchTerm);
}
