export {};

// Mock winston before importing the module
jest.mock('winston', () => {
  const mockLogger = { info: jest.fn() };
  return {
    createLogger: jest.fn().mockReturnValue(mockLogger),
    format: { json: jest.fn().mockReturnValue({}) },
    transports: {
      File: jest.fn().mockImplementation(() => ({})),
    },
  };
});

// Mock fs so it doesn't create real directories
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

import { logWigleAuditEvent } from '../../server/src/services/wigleAuditLogger';
import * as winston from 'winston';

describe('wigleAuditLogger', () => {
  const mockWinstonLogger = (winston.createLogger as jest.Mock).mock.results[0]?.value;

  test('logWigleAuditEvent calls logger.info with payload and timestamp', () => {
    const payload = {
      entrypoint: '/api/wigle/search',
      endpointType: 'search',
      paramsHash: 'abc123',
      status: 200,
      latencyMs: 42,
      servedFromCache: false,
      retryCount: 0,
    };

    logWigleAuditEvent(payload);

    expect(mockWinstonLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        ...payload,
        timestampIso: expect.any(String),
      })
    );
  });

  test('logWigleAuditEvent includes optional kind field when provided', () => {
    const payload = {
      entrypoint: '/api/wigle/live',
      endpointType: 'live',
      paramsHash: 'xyz',
      status: 429,
      latencyMs: 100,
      servedFromCache: false,
      retryCount: 2,
      kind: 'rate_limited',
    };

    logWigleAuditEvent(payload);

    expect(mockWinstonLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'rate_limited' })
    );
  });

  test('timestampIso is a valid ISO string', () => {
    const payload = {
      entrypoint: '/test',
      endpointType: 'test',
      paramsHash: 'h',
      status: 200,
      latencyMs: 1,
      servedFromCache: true,
      retryCount: 0,
    };

    logWigleAuditEvent(payload);

    const call = mockWinstonLogger.info.mock.calls.at(-1)[0];
    expect(() => new Date(call.timestampIso).toISOString()).not.toThrow();
  });
});
