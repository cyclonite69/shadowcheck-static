import { getImportCompletenessSummary } from '../runRepository';

type ImportCompletenessOptions = {
  searchTerm?: string;
  state?: string;
};

/**
 * Map raw completeness rows into the API report contract used by the admin routes.
 */
export const getImportCompletenessReport = async (options: ImportCompletenessOptions) => {
  const rows = await getImportCompletenessSummary(options);

  return {
    generatedAt: new Date().toISOString(),
    states: rows.map((row: any) => ({
      state: row.state,
      localRows: Number(row.local_rows || 0),
      localUniqueBssids: Number(row.local_unique_bssids || 0),
      storedCount: Number(row.local_unique_bssids ?? row.stored_count ?? 0),
      runId: row.run_id === null ? null : Number(row.run_id),
      searchTerm: row.search_term || null,
      requestParams: row.request_params || null,
      requestFingerprint: row.request_fingerprint || null,
      status: row.status || null,
      apiTotalResults: row.api_total_results === null ? null : Number(row.api_total_results),
      totalPages: row.total_pages === null ? null : Number(row.total_pages),
      pageSize: row.page_size === null ? null : Number(row.page_size),
      pagesFetched: row.pages_fetched === null ? null : Number(row.pages_fetched),
      rowsReturned: row.rows_returned === null ? null : Number(row.rows_returned),
      rowsInserted: row.rows_inserted === null ? null : Number(row.rows_inserted),
      lastSuccessfulPage:
        row.last_successful_page === null ? null : Number(row.last_successful_page),
      nextPage: row.next_page === null ? null : Number(row.next_page),
      apiCursor: row.api_cursor || null,
      lastError: row.last_error || null,
      startedAt: row.started_at || null,
      updatedAt: row.updated_at || null,
      completedAt: row.completed_at || null,
      missingApiRows: row.missing_api_rows === null ? null : Number(row.missing_api_rows),
      missingInsertRows: row.missing_insert_rows === null ? null : Number(row.missing_insert_rows),
      resumable: row.status ? ['running', 'paused', 'failed'].includes(row.status) : false,
    })),
  };
};
