import { useMemo } from 'react';
import { DbStats, TableStat } from './useDbStats';

export interface CategorizedTables {
  coreAndInfra: TableStat[];
  wigle: TableStat[];
  kismet: TableStat[];
}

export const useTableCategories = (stats: DbStats | null): CategorizedTables => {
  return useMemo(() => {
    if (!stats) {
      return { coreAndInfra: [], wigle: [], kismet: [] };
    }

    const getTablesByCategory = (category: string) => {
      const tableNames = stats.categories[category] || [];
      return stats.tables.filter((t) => tableNames.includes(t.table_name));
    };

    return {
      coreAndInfra: [...getTablesByCategory('core'), ...getTablesByCategory('infra')],
      wigle: getTablesByCategory('wigle'),
      kismet: getTablesByCategory('kismet'),
    };
  }, [stats]);
};
