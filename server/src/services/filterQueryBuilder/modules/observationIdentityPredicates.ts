import { SqlFragmentLibrary } from '../SqlFragmentLibrary';
import { isOui, coerceOui, splitTextFilterTokens } from '../normalizers';
import type { FilterBuildContext } from '../FilterBuildContext';

export function buildObservationIdentityPredicates(ctx: FilterBuildContext): string[] {
  const where: string[] = [];
  const f = ctx.filters;
  const e = ctx.enabled;

  if (e.ssid && f.ssid) {
    const ssidTokens = splitTextFilterTokens(f.ssid);
    const predicates = (ssidTokens.length > 0 ? ssidTokens : [String(f.ssid)]).map(
      (token) => `o.ssid ILIKE ${ctx.addParam(`%${token}%`)}`
    );
    where.push(predicates.length === 1 ? predicates[0] : `(${predicates.join(' OR ')})`);
    ctx.addApplied('identity', 'ssid', f.ssid);
  }

  if (e.bssid && f.bssid) {
    const bssidTokens = splitTextFilterTokens(f.bssid);
    const predicates = (bssidTokens.length > 0 ? bssidTokens : [String(f.bssid)]).map((token) => {
      const value = token.toUpperCase();
      return value.length === 17
        ? `UPPER(o.bssid) = ${ctx.addParam(value)}`
        : `UPPER(o.bssid) LIKE ${ctx.addParam(`${value}%`)}`;
    });
    where.push(predicates.length === 1 ? predicates[0] : `(${predicates.join(' OR ')})`);
    ctx.addApplied('identity', 'bssid', f.bssid);
  }

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
