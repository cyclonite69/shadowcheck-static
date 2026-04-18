export {};

function assertBulkWigleAllowed(operation: string) {
  if (process.env.WIGLE_ALLOW_BULK === 'I_UNDERSTAND') {
    return;
  }

  const error: any = new Error(
    `Bulk WiGLE operation blocked: ${operation}. Set WIGLE_ALLOW_BULK=I_UNDERSTAND to enable this intentionally.`
  );
  error.status = 403;
  error.code = 'WIGLE_BULK_DISABLED';
  throw error;
}

export { assertBulkWigleAllowed };
