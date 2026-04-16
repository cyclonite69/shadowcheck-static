import { SqlFragmentLibrary } from '../SqlFragmentLibrary';
import { isOui, coerceOui, splitTextFilterTokens } from '../normalizers';
import type { FilterBuildContext } from '../FilterBuildContext';

export function buildObservationIdentityPredicates(ctx: FilterBuildContext): string[] {
  const where: string[] = [];
  const f = ctx.filters;
  const e = ctx.enabled;

  // Note: SSID and BSSID filtering is now handled at the network level in networkWhereBuilder.ts
  // This ensures that when filtering by network SSID/BSSID, all observations from that network
  // are returned (including those recorded with different SSIDs), rather than filtering out
  // observations that don't match the search term.
  // See: https://github.com/anthropics/shadowcheck-web/issues/XXXX

  if (e.manufacturer && f.manufacturer) {
    const manufacturerTokens = splitTextFilterTokens(f.manufacturer);
    const predicates = (
      manufacturerTokens.length > 0 ? manufacturerTokens : [String(f.manufacturer)]
    ).map((token) => {
      const cleaned = coerceOui(token);
      if (isOui(cleaned)) {
        return `UPPER(REPLACE(SUBSTRING(o.bssid, 1, 8), ':', '')) = ${ctx.addParam(cleaned)}`;
      }
      ctx.obsJoins.add(SqlFragmentLibrary.joinRadioManufacturers('o', 'rm'));
      return `rm.manufacturer ILIKE ${ctx.addParam(`%${token}%`)}`;
    });
    where.push(predicates.length === 1 ? predicates[0] : `(${predicates.join(' OR ')})`);
    ctx.addApplied('identity', 'manufacturer', f.manufacturer);
  }

  return where;
}
