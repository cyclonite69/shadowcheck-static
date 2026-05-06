import { withRetry, delay } from '../../../server/src/services/externalServiceHandler';

describe('externalServiceHandler', () => {
  it('should return result on success', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    const result = await withRetry(mockFn);
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(mockFn, { maxRetries: 1, retryDelayMs: 1 });
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('always fail'));
    await expect(withRetry(mockFn, { maxRetries: 1, retryDelayMs: 1 })).rejects.toThrow(
      'always fail'
    );
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should timeout', async () => {
    const mockFn = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('slow'), 50)));
    await expect(withRetry(mockFn, { timeoutMs: 10, retryDelayMs: 1 })).rejects.toThrow(
      'timed out'
    );
  });

  it('includes serviceName in timeout error message', async () => {
    const mockFn = jest
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve('slow'), 50)));
    await expect(
      withRetry(mockFn, { timeoutMs: 10, retryDelayMs: 1, serviceName: 'WiGLE API' })
    ).rejects.toThrow('WiGLE API timed out after 10ms');
  });

  it('includes serviceName in final retry-exhausted error message', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('connection refused'));
    await expect(
      withRetry(mockFn, { maxRetries: 1, retryDelayMs: 1, serviceName: 'Geocoder' })
    ).rejects.toThrow('Geocoder failed after 2 attempts: connection refused');
  });

  it('calls fn exactly maxRetries+1 times before throwing', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
    await expect(withRetry(mockFn, { maxRetries: 3, retryDelayMs: 1 })).rejects.toThrow();
    expect(mockFn).toHaveBeenCalledTimes(4);
  });

  it('succeeds on last allowed attempt', async () => {
    const mockFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('finally');
    const result = await withRetry(mockFn, { maxRetries: 2, retryDelayMs: 1 });
    expect(result).toBe('finally');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('delay resolves after approximately the given ms', async () => {
    const start = Date.now();
    await delay(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });

  it('uses default options when none provided', async () => {
    const mockFn = jest.fn().mockResolvedValue(42);
    const result = await withRetry(mockFn);
    expect(result).toBe(42);
  });
});
