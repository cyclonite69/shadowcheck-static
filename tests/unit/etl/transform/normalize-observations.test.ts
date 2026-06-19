import { main, normalizeObservations } from '../../../../etl/transform/normalize-observations';

jest.mock('../../../../etl/transform/process-observations', () => ({
  normalizeObservations: jest.fn(),
}));

import { normalizeObservations as mockNormalize } from '../../../../etl/transform/process-observations';

describe('normalize-observations script wrapper', () => {
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

  it('should export normalizeObservations', () => {
    expect(normalizeObservations).toBeDefined();
  });

  it('should run normalizeObservations successfully when main(true) is called', async () => {
    (mockNormalize as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(main(true)).resolves.toBeUndefined();
    expect(mockNormalize).toHaveBeenCalledTimes(1);
  });

  it('should call process.exit(1) and console.error when normalizeObservations throws', async () => {
    const error = new Error('Mock error');
    (mockNormalize as jest.Mock).mockRejectedValueOnce(error);

    await expect(main(true)).rejects.toThrow('process.exit called with 1');
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it('should do nothing when main(false) is called', async () => {
    await main(false);
    expect(mockNormalize).not.toHaveBeenCalled();
  });
});
