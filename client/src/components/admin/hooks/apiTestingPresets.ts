/**
 * Backward-compat re-export shim.
 * All endpoint data now lives in `client/src/config/apiTestEndpoints.ts`.
 * Import from there for new code; existing hook imports from here still work.
 */
export type {
  ApiInput,
  ApiEndpointConfig as ApiPreset,
  HttpMethod,
} from '../../../config/apiTestEndpoints';
import { API_ENDPOINTS } from '../../../config/apiTestEndpoints';

export const API_PRESETS = API_ENDPOINTS;
export const MANUAL_API_PRESETS = API_PRESETS.filter(
  (preset) => preset.manualOnly || preset.isDestructive
);
export const AUTOMATED_API_PRESETS = API_PRESETS.filter(
  (preset) => !preset.manualOnly && !preset.isDestructive
);
