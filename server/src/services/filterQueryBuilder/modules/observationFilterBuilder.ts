import { OBS_TYPE_EXPR, WIFI_CHANNEL_EXPR } from '../sqlExpressions';
import { buildRadioPredicates } from '../radioPredicates';
import { buildEngagementPredicates } from '../engagementPredicates';
import type { FilterBuildContext } from '../FilterBuildContext';
import type { ObservationFiltersResult } from '../types';
import { buildObservationIdentityPredicates } from './observationIdentityPredicates';
import { buildObservationSecurityTemporalPredicates } from './observationSecurityTemporalPredicates';
import { buildObservationSpatialQualityPredicates } from './observationSpatialQualityPredicates';

const NT_FILTER_TAG_LOWER_EXPR = 'LOWER(nt_filter.threat_tag)';
const NT_FILTER_IS_IGNORED_EXPR = 'COALESCE(nt_filter.is_ignored, FALSE)';

export function buildObservationFilters(ctx: FilterBuildContext): ObservationFiltersResult {
  const where: string[] = [];
  where.push(...buildObservationSpatialQualityPredicates(ctx));
  where.push(...buildObservationIdentityPredicates(ctx));

  const radioResult = buildRadioPredicates({
    enabled: ctx.enabled,
    filters: ctx.filters,
    addParam: ctx.addParam.bind(ctx),
    expressions: {
      typeExpr: OBS_TYPE_EXPR('o'),
      frequencyExpr: 'o.radio_frequency',
      channelExpr: WIFI_CHANNEL_EXPR('o'),
      signalExpr: 'o.level',
    },
    options: {
      rssiRequireNotNullExpr: 'o.level IS NOT NULL',
      rssiIncludeNoiseFloor: true,
    },
  });
  where.push(...radioResult.where);
  radioResult.applied.forEach((entry) => ctx.addApplied('radio', entry.field, entry.value));

  where.push(...buildObservationSecurityTemporalPredicates(ctx));

  const engagementResult = buildEngagementPredicates({
    enabled: ctx.enabled,
    filters: ctx.filters,
    addParam: ctx.addParam.bind(ctx),
    bssidExpr: 'o.bssid',
    tagAlias: 'nt_filter',
    tagLowerExpr: NT_FILTER_TAG_LOWER_EXPR,
    tagIgnoredExpr: NT_FILTER_IS_IGNORED_EXPR,
  });
  where.push(...engagementResult.where);
  engagementResult.applied.forEach((entry) =>
    ctx.addApplied('engagement', entry.field, entry.value)
  );

  return { where, joins: Array.from(ctx.obsJoins) };
}
