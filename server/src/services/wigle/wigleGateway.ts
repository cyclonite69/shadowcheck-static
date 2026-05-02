/**
 * WiGLE Gateway
 * Single auditable exit point for all outbound WiGLE API calls.
 * Wraps wigleClient.ts with typed request/response, structured logging,
 * and search-param validation via wigleApiSpec.ts.
 */

import logger from '../../logging/logger';
import { fetchWigle } from '../wigleClient';
import { validateWigleSearchParams, WigleValidationError } from '../wigleImport/wigleApiSpec';
import { logWigleAuditEvent } from '../wigleAuditLogger';
import { hashRecord } from '../wigleRequestUtils';
import { updateLedgerOutcome } from '../wigleRequestLedger';

export type WigleRequestKind = 'search' | 'detail' | 'stats';

export interface WigleGatewayRequest {
  kind: WigleRequestKind;
  url: string;
  init?: RequestInit;
  timeoutMs?: number;
  maxRetries?: number;
  label?: string;
  priority?: 'interactive' | 'background';
  entrypoint?: string;
  endpointType?: string;
  /** If provided, params are validated against the v2 search spec before the request is sent. */
  searchParams?: URLSearchParams;
}

export type WigleGatewayResult =
  | { ok: true; response: Response; latencyMs: number }
  | { ok: false; error: string; status?: number; validationError?: boolean };

/**
 * Send a single outbound request to the WiGLE API through the gateway.
 * Never throws — returns a structured result.
 */
export async function wigleGatewayFetch(req: WigleGatewayRequest): Promise<WigleGatewayResult> {
  const { kind, url, init, searchParams, entrypoint = 'gateway', endpointType } = req;
  const paramsHash = hashRecord({ url, kind });

  // Validate search params before sending (search calls only)
  if (searchParams) {
    try {
      validateWigleSearchParams(searchParams);
    } catch (err) {
      if (err instanceof WigleValidationError) {
        logger.error(`[WiGLE Gateway] Param validation blocked request`, {
          invalidKey: err.invalidKey,
          invalidValue: err.invalidValue,
          url,
        });
        logWigleAuditEvent({
          entrypoint,
          endpointType: endpointType ?? kind,
          paramsHash,
          status: 'VALIDATION_ERROR',
          latencyMs: 0,
          servedFromCache: false,
          retryCount: 0,
          kind,
        });
        return { ok: false, error: err.message, validationError: true };
      }
      throw err;
    }
  }

  const startedAt = Date.now();

  try {
    const response = await fetchWigle({
      kind,
      url,
      init,
      timeoutMs: req.timeoutMs,
      maxRetries: req.maxRetries,
      label: req.label,
      priority: req.priority,
      entrypoint,
      paramsHash,
      endpointType,
    });

    const latencyMs = Date.now() - startedAt;

    logWigleAuditEvent({
      entrypoint,
      endpointType: endpointType ?? kind,
      paramsHash,
      status: response.ok ? 'OK' : String(response.status),
      latencyMs,
      servedFromCache: false,
      retryCount: 0,
      kind,
    });

    updateLedgerOutcome(kind, {
      status: response.ok ? 'success' : 'error',
      duration_ms: latencyMs,
    });

    return { ok: true, response, latencyMs };
  } catch (err: any) {
    const latencyMs = Date.now() - startedAt;
    const status: number | undefined = err?.status;

    logWigleAuditEvent({
      entrypoint,
      endpointType: endpointType ?? kind,
      paramsHash,
      status: status ? String(status) : 'ERROR',
      latencyMs,
      servedFromCache: false,
      retryCount: 0,
      kind,
    });

    const ledgerStatus = status === 429 ? 'rate_limited' : 'error';
    updateLedgerOutcome(kind, {
      status: ledgerStatus,
      duration_ms: latencyMs,
      error_message: err?.message ?? String(err),
    });

    return { ok: false, error: err?.message ?? String(err), status };
  }
}
