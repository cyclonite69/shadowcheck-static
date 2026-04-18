export {};

export const getConfiguredAwsRegion =
  require('../../../services/awsService').getConfiguredAwsRegion;

export const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const getIncomingValue = (
  body: Record<string, unknown>,
  primaryKey: string,
  fallbackKey = 'value'
) => body[primaryKey] ?? body[fallbackKey];

function validateMapboxToken(value: unknown) {
  const validation = validateString(String(value || ''), 1, 255, 'token');
  if (!validation.valid) {
    return validation;
  }

  const token = String(value).trim();
  if (!token.startsWith('pk.') && !token.startsWith('sk.')) {
    return { valid: false, error: 'token must start with pk. or sk.' };
  }

  return { valid: true, value: token };
}

function validateLabel(value: unknown) {
  const validation = validateString(String(value || ''), 1, 255, 'label');
  if (!validation.valid) {
    return validation;
  }
  return { valid: true, value: String(value).trim() };
}

function validateGoogleMapsKey(value: unknown) {
  const validation = validateString(String(value || ''), 1, 255, 'google_maps_api_key');
  if (!validation.valid) {
    return validation;
  }
  return { valid: true, value: String(value).trim() };
}

function validateGenericKey(value: unknown, field: string) {
  const validation = validateString(String(value || ''), 1, 255, field);
  if (!validation.valid) {
    return validation;
  }
  return { valid: true, value: String(value).trim() };
}

function validateAwsRegion(value: unknown) {
  const validation = validateString(String(value || ''), 1, 255, 'aws_region');
  if (!validation.valid) {
    return validation;
  }
  return { valid: true, value: String(value).trim() };
}

export function validateString(value: string, min: number, max: number, field: string) {
  return require('../../../validation/schemas').validateString(value, min, max, field);
}

module.exports = {
  getConfiguredAwsRegion,
  getErrorMessage,
  getIncomingValue,
  validateAwsRegion,
  validateGenericKey,
  validateGoogleMapsKey,
  validateLabel,
  validateMapboxToken,
  validateString,
};
