import { useMemo } from 'react';
import { DbStats, TableStat } from './useDbStats';

export interface CategorizedTables {
  coreAndInfra: TableStat[];
  wigle: TableStat[];
  kismet: TableStat[];
  uncategorized: TableStat[];
}

export const useTableCategories = (stats: DbStats | null): CategorizedTables => {
  return useMemo(() => {
    if (!stats) {
      return { coreAndInfra: [], wigle: [], kismet: [], uncategorized: [] };
    }

    const getTablesByCategory = (category: string) => {
      const tableNames = stats.categories[category] || [];
      return stats.tables.filter((t) => tableNames.includes(t.table_name));
    };

    const categorized = new Set(
      [
        ...getTablesByCategory('core'),
        ...getTablesByCategory('infra'),
        ...getTablesByCategory('wigle'),
        ...getTablesByCategory('kismet'),
      ].map((t) => t.table_name)
    );

    const uncategorized = stats.tables.filter((t) => !categorized.has(t.table_name));

    return {
      coreAndInfra: [...getTablesByCategory('core'), ...getTablesByCategory('infra')],
      wigle: getTablesByCategory('wigle'),
      kismet: getTablesByCategory('kismet'),
      uncategorized,
    };
  }, [stats]);
};
