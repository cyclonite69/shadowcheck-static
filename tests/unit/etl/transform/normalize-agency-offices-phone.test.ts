import { main, normalizePhones } from '../../../../etl/transform/normalize-agency-offices-phone';

jest.mock('../../../../etl/transform/process-agencies', () => ({
  normalizePhones: jest.fn(),
}));

import { normalizePhones as mockNormalizePhones } from '../../../../etl/transform/process-agencies';

describe('normalize-agency-offices-phone script wrapper', () => {
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

  it('should export normalizePhones', () => {
    expect(normalizePhones).toBeDefined();
  });

  it('should run normalizePhones with dryRun = true when main(true, []) is called', async () => {
    (mockNormalizePhones as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(main(true, [])).resolves.toBeUndefined();
    expect(mockNormalizePhones).toHaveBeenCalledWith({ dryRun: true });
  });

  it('should run normalizePhones with dryRun = false when main(true, ["--live"]) is called', async () => {
    (mockNormalizePhones as jest.Mock).mockResolvedValueOnce(undefined);

    await expect(main(true, ['node', 'script', '--live'])).resolves.toBeUndefined();
    expect(mockNormalizePhones).toHaveBeenCalledWith({ dryRun: false });
  });

  it('should call process.exit(1) and console.error when normalizePhones throws', async () => {
    const error = new Error('Mock phone error');
    (mockNormalizePhones as jest.Mock).mockRejectedValueOnce(error);

    await expect(main(true, [])).rejects.toThrow('process.exit called with 1');
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it('should do nothing when main(false) is called', async () => {
    await main(false);
    expect(mockNormalizePhones).not.toHaveBeenCalled();
  });
});
