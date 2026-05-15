import logger from '../../../logging/logger';
import { mapCreditSnapshotToValidation } from '../mappers/enrichmentMapper';
import { fetchWigleApiCreditSnapshot } from '../repositories/wigleApiCreditGateway';

/**
 * Validate that the configured WiGLE account still has API credit.
 */
export async function validateWigleApiCredit() {
  try {
    const result = await fetchWigleApiCreditSnapshot();

    if (!result.ok) {
      if (result.status === 401) {
        return { hasCredit: false, message: result.message };
      }
      if (result.message === 'WiGLE API credentials not configured') {
        return { hasCredit: false, message: result.message };
      }
      logger.error('[WiGLE] API credit check failed:', result.message);
      return { hasCredit: true, message: 'Credit check unavailable (proceeding with request)' };
    }

    const validation = mapCreditSnapshotToValidation(result.snapshot);
    if (result.snapshot.remaining < 10 && validation.hasCredit) {
      logger.warn(`[WiGLE] Low API credit: ${result.snapshot.remaining} requests remaining`);
    }
    return validation;
  } catch (err) {
    logger.error('[WiGLE] Error checking API credit:', err);
    return { hasCredit: true, message: 'Credit check unavailable (proceeding with request)' };
  }
}
