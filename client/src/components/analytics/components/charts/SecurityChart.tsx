import React from 'react';
import { AnalyticsData } from '../../hooks/useAnalyticsData';
import { hasValidPieData } from '../../utils/chartHelpers';
import { DEBUG_ANALYTICS } from '../../utils/chartConstants';
import { PieChartWithLegend } from './PieChartWithLegend';

interface Props {
  data: AnalyticsData;
  debouncedFilterState: any;
  renderEmptyState: (message?: string) => React.ReactElement;
}

export const SecurityChart: React.FC<Props> = ({
  data,
  debouncedFilterState,
  renderEmptyState,
}) => {
  if (DEBUG_ANALYTICS) {
    console.info('[analytics] rendering security pie:', {
      timeframeEnabled: debouncedFilterState?.enabled?.timeframe,
      dataLength: data.security?.length,
      data: data.security,
      dataIsArray: Array.isArray(data.security),
      hasValidData:
        data.security && data.security.length > 0 && data.security.some((item) => item.value > 0),
    });
  }
  if (!hasValidPieData(data.security)) {
    if (DEBUG_ANALYTICS) {
      console.info('Security data empty, null, or not array:', data.security);
    }
    return renderEmptyState();
  }
  const validData = data.security.filter(
    (item) => item && typeof item.value === 'number' && !isNaN(item.value) && item.value > 0
  );
  if (validData.length === 0) {
    if (DEBUG_ANALYTICS) {
      console.info('No valid security data after filtering:', data.security);
    }
    return renderEmptyState();
  }
  return (
    <PieChartWithLegend
      data={validData}
      chartKey={`security-${validData.length}-${debouncedFilterState?.enabled?.timeframe ? 'filtered' : 'all'}`}
      cellKeyPrefix="sec-cell"
    />
  );
};
