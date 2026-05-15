import logger from '../../../logging/logger';
import {
  completeRun,
  getRunOrThrow,
  markRunControlStatus,
  markRunFailure,
  persistPageFailure,
  reconcileRunProgress,
} from '../runRepository';
import { DEFAULT_RESULTS_PER_PAGE, normalizeImportParams } from '../params';
import { processSuccessfulPage } from '../pageProcessor';
import { getEncodedWigleAuth } from '../authProvider';
import { getAdaptiveDelay, sleep } from '../rateLimitingStrategy';
import { fetchWiglePage, type WiglePageResponse } from '../wigleApiClient';

/**
 * Coordinates the long-running WiGLE import loop.
 * This class owns retry behavior, page lifecycle, and terminal run-state transitions.
 */
export class WigleImportRunOrchestrator {
  /**
   * Execute the paginated import loop for one persisted run.
   */
  async execute(runId: number) {
    const encodedAuth = getEncodedWigleAuth();
    let run = (await reconcileRunProgress(runId)) ?? (await getRunOrThrow(runId));

    if (run.status === 'completed' || run.status === 'cancelled') {
      return run;
    }

    const requestParams = normalizeImportParams(run.request_params || {});

    for (;;) {
      run = await getRunOrThrow(runId);

      if (run.status === 'paused' || run.status === 'cancelled') {
        logger.info('[WiGLE Import] Run stopped by operator', { runId, status: run.status });
        return run;
      }

      const pageNumber = Number(run.next_page || 1);
      const requestCursor = run.api_cursor || null;

      logger.info('[WiGLE Import] Fetching page', {
        runId,
        pageNumber,
        requestCursor,
        state: run.state,
        searchTerm: run.search_term,
      });

      try {
        const data = await this.fetchPageWithRetry(
          encodedAuth,
          requestParams,
          requestCursor,
          runId,
          pageNumber
        );

        const results = Array.isArray(data?.results) ? data.results : [];
        const liveTotal =
          data?.totalResults !== undefined && data?.totalResults !== null
            ? Number(data.totalResults)
            : null;
        const totalResults =
          liveTotal ?? (run.api_total_results !== null ? Number(run.api_total_results) : null);
        const nextCursor =
          data?.search_after !== undefined && data?.search_after !== null
            ? String(data.search_after)
            : null;
        const pageSize = requestParams.resultsPerPage || DEFAULT_RESULTS_PER_PAGE;

        this.assertPaginationMetadata(
          pageNumber,
          pageSize,
          results.length,
          totalResults,
          nextCursor
        );

        if (results.length === 0 && nextCursor === null) {
          const note =
            pageNumber === 1
              ? 'No records returned on first page — API quota may be exhausted or no results match the search'
              : undefined;
          return completeRun(runId, note);
        }

        const totalPages =
          totalResults !== null ? Math.max(1, Math.ceil(totalResults / pageSize)) : null;
        const isComplete =
          nextCursor === null &&
          (totalPages === null || pageNumber >= totalPages || results.length < pageSize);

        run = await processSuccessfulPage(
          runId,
          pageNumber,
          requestCursor,
          nextCursor,
          results,
          liveTotal,
          pageSize,
          isComplete
        );

        if (isComplete) {
          return run;
        }

        await sleep(getAdaptiveDelay());
      } catch (error: any) {
        return this.handlePageFailure(runId, pageNumber, requestCursor, error);
      }
    }
  }

  private async fetchPageWithRetry(
    encodedAuth: string,
    requestParams: ReturnType<typeof normalizeImportParams>,
    requestCursor: string | null,
    runId: number,
    pageNumber: number
  ): Promise<WiglePageResponse> {
    try {
      return await fetchWiglePage(encodedAuth, requestParams, requestCursor);
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        logger.error('[WiGLE Import] AUTH ERROR — halting pipeline, do not retry', {
          runId,
          pageNumber,
          status: error?.status,
          details: String(error?.details || error?.message || '').slice(0, 500),
        });
        throw error;
      }

      if (error?.status !== 429) {
        throw error;
      }

      const delayMs = WigleImportRunOrchestrator.computeRetryDelayMs(error?.retryAfter);
      logger.warn('[WiGLE Import] Rate limited (429) — waiting then retrying once', {
        runId,
        pageNumber,
        delayMs,
        retryAfter: error?.retryAfter ?? null,
      });
      await sleep(delayMs);

      try {
        return await fetchWiglePage(encodedAuth, requestParams, requestCursor);
      } catch (retryError: any) {
        if (retryError?.status === 429) {
          logger.error('[WiGLE Import] Rate limited again after single retry — halting run', {
            runId,
            pageNumber,
            retryAfter: retryError?.retryAfter ?? null,
            details: String(retryError?.details || retryError?.message || '').slice(0, 500),
          });
        }
        throw retryError;
      }
    }
  }

  private assertPaginationMetadata(
    pageNumber: number,
    pageSize: number,
    resultCount: number,
    totalResults: number | null,
    nextCursor: string | null
  ) {
    if (totalResults !== null && Number.isFinite(totalResults) && totalResults >= 0) {
      const expectedPages = Math.max(1, Math.ceil(totalResults / pageSize));
      if (pageNumber > expectedPages && resultCount > 0) {
        throw new Error(
          `WiGLE pagination metadata mismatch: page ${pageNumber} exceeded expected page count ${expectedPages}`
        );
      }
    }

    if (resultCount === 0 && nextCursor) {
      throw new Error(
        `WiGLE pagination metadata inconsistent: empty page ${pageNumber} returned with a next cursor`
      );
    }
  }

  private async handlePageFailure(
    runId: number,
    pageNumber: number,
    requestCursor: string | null,
    error: any
  ) {
    const errorMessage = error?.details || error?.message || 'WiGLE import page failed';
    await persistPageFailure(runId, pageNumber, requestCursor, errorMessage);

    if (error?.status === 401 || error?.status === 403) {
      return markRunFailure(runId, errorMessage);
    }

    if (error?.status === 429) {
      const run = await markRunControlStatus(runId, 'paused');
      logger.warn('[WiGLE Import] Daily quota exhausted — run paused for later resumption', {
        runId,
        pageNumber,
      });
      return run;
    }

    return markRunFailure(runId, errorMessage);
  }

  private static computeRetryDelayMs(retryAfterRaw: unknown): number {
    const fallbackMs = 60_000;
    const raw = typeof retryAfterRaw === 'string' ? retryAfterRaw.trim() : '';
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    const baseMs = Number.isFinite(parsed) && parsed > 0 ? parsed * 1000 : fallbackMs;
    const jitterMs = Math.floor(baseMs * (Math.random() * 0.1));
    return baseMs + jitterMs;
  }
}
