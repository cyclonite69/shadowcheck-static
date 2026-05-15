type QueryResultLike = Promise<any>;

/**
 * Resolve admin query functions lazily through the DI container.
 * This preserves the current runtime behavior and existing test mocks.
 */
function adminQuery(text: string, params: any[] = []): QueryResultLike {
  return require('../../../config/container').adminDbService.adminQuery(text, params);
}

/**
 * Long-running admin query variant with no statement timeout.
 */
function longRunningAdminQuery(text: string, params: any[] = []): QueryResultLike {
  return require('../../../config/container').adminDbService.longRunningAdminQuery(text, params);
}

export { adminQuery, longRunningAdminQuery };
