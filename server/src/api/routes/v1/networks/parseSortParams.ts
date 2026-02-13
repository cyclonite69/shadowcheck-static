/**
 * Sort parameter parsing for the network list route.
 */

export {};

const { safeJsonParse } = require('../../../utils/safeJsonParse');

interface SortEntry {
  column: string;
  direction: string;
}

interface ParseSortResult {
  sortEntries: SortEntry[];
  ignoredSorts: string[];
  sortClauses: string;
  expensiveSort: boolean;
}

function parseSortParams(
  sortRaw: any,
  orderRaw: any,
  sortColumnMap: Record<string, string>,
  indexedSorts: Set<string>
): ParseSortResult {
  const parseSortJson = (value: any) => safeJsonParse(value);
  const parseOrderColumns = (value: any) =>
    String(value)
      .split(',')
      .map((item: string) => item.trim().toUpperCase())
      .filter(Boolean);

  const parsedSortJson = parseSortJson(sortRaw);
  const parsedOrderJson = parseSortJson(orderRaw);

  const sortEntries: SortEntry[] = [];
  const ignoredSorts: string[] = [];

  if (Array.isArray(parsedSortJson) || (parsedSortJson && typeof parsedSortJson === 'object')) {
    const entries = Array.isArray(parsedSortJson) ? parsedSortJson : [parsedSortJson];
    entries.forEach((entry: any) => {
      if (!entry || typeof entry !== 'object') return;
      const column = String(entry.column || '')
        .trim()
        .toLowerCase();
      if (!sortColumnMap[column]) {
        if (column) ignoredSorts.push(column);
        return;
      }
      const dir = String(entry.direction || 'ASC')
        .trim()
        .toUpperCase();
      sortEntries.push({ column, direction: ['ASC', 'DESC'].includes(dir) ? dir : 'ASC' });
    });
  } else {
    const sortColumns = String(sortRaw)
      .split(',')
      .map((value: string) => value.trim().toLowerCase())
      .filter(Boolean);
    const orderColumns = Array.isArray(parsedOrderJson)
      ? parsedOrderJson.map((v: any) => String(v).trim().toUpperCase())
      : parseOrderColumns(orderRaw);

    const normalizedOrders =
      orderColumns.length === 1 ? sortColumns.map(() => orderColumns[0]) : orderColumns;

    sortColumns.forEach((col: string, idx: number) => {
      if (!sortColumnMap[col]) {
        ignoredSorts.push(col);
        return;
      }
      const dir = normalizedOrders[idx] || 'ASC';
      sortEntries.push({
        column: col,
        direction: ['ASC', 'DESC'].includes(dir) ? dir : 'ASC',
      });
    });
  }

  if (sortEntries.length === 0) {
    sortEntries.push({ column: 'last_seen', direction: 'DESC' });
  }

  const expensiveSort = !(sortEntries.length === 1 && indexedSorts.has(sortEntries[0].column));

  const sortClauses = sortEntries
    .map((entry) => {
      const col = sortColumnMap[entry.column];
      return `${col} ${entry.direction}`;
    })
    .join(', ');

  return { sortEntries, ignoredSorts, sortClauses, expensiveSort };
}

module.exports = { parseSortParams };
