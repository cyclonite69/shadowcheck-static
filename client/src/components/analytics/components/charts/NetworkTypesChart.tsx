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

export const NetworkTypesChart: React.FC<Props> = ({
  data,
  debouncedFilterState,
  renderEmptyState,
}) => {
  if (DEBUG_ANALYTICS) {
    console.info('[analytics] rendering network-types pie:', {
      timeframeEnabled: debouncedFilterState?.enabled?.timeframe,
      dataLength: data.networkTypes?.length,
      data: data.networkTypes,
      dataIsArray: Array.isArray(data.networkTypes),
      hasValidData:
        data.networkTypes &&
        data.networkTypes.length > 0 &&
        data.networkTypes.some((item) => item.value > 0),
    });
  }
  if (!hasValidPieData(data.networkTypes)) {
    if (DEBUG_ANALYTICS) {
      console.info('Network types data empty, null, or not array:', data.networkTypes);
    }
    return renderEmptyState();
  }
  const validData = data.networkTypes.filter(
    (item) => item && typeof item.value === 'number' && !isNaN(item.value) && item.value > 0
  );
  if (validData.length === 0) {
    if (DEBUG_ANALYTICS) {
      console.info('No valid network types data after filtering:', data.networkTypes);
    }
    return renderEmptyState();
  }
  return (
    <PieChartWithLegend
      data={validData}
      chartKey={`network-types-${validData.length}-${debouncedFilterState?.enabled?.timeframe ? 'filtered' : 'all'}`}
      cellKeyPrefix="cell"
    />
  );
};
