import { main, deduplicateObservations } from '../../../../etl/transform/deduplicate';

jest.mock('../../../../etl/transform/process-observations', () => ({
  deduplicateObservations: jest.fn(),
}));

import { deduplicateObservations as mockDeduplicate } from '../../../../etl/transform/process-observations';

describe('deduplicate script wrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest
      .spyOn(process, 'exit')
      .mockImplementation((code?: string | number | null | undefined): never => {
        throw new Error(`process.exit called with ${code}`);
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should export deduplicateObservations', () => {
    expect(deduplicateObservations).toBeDefined();
  });

  it('should run deduplicateObservations successfully when main(true) is called', async () => {
    (mockDeduplicate as jest.Mock).mockResolvedValueOnce({ before: 10, after: 8, removed: 2 });

    await expect(main(true)).resolves.toBeUndefined();
    expect(mockDeduplicate).toHaveBeenCalledTimes(1);
  });

  it('should call process.exit(1) and console.error when deduplicateObservations throws', async () => {
    const error = new Error('Mock error');
    (mockDeduplicate as jest.Mock).mockRejectedValueOnce(error);

    await expect(main(true)).rejects.toThrow('process.exit called with 1');
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it('should do nothing when main(false) is called', async () => {
    await main(false);
    expect(mockDeduplicate).not.toHaveBeenCalled();
  });
});
