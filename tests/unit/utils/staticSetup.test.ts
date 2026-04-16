import { mountStaticAssets, registerSpaFallback } from '../../../server/src/utils/staticSetup';

// Mock dependencies
jest.mock('../../../server/src/middleware/staticAssets', () => ({
  mountStaticAssets: jest.fn(),
}));

jest.mock('../../../server/src/middleware/spaFallback', () => ({
  createSpaFallback: jest.fn().mockReturnValue((req: any, res: any) => res.send('SPA')),
}));

describe('staticSetup', () => {
  const mockApp: any = {
    get: jest.fn(),
  };

  it('should mount static assets', () => {
    mountStaticAssets(mockApp, '/dist');
    const { mountStaticAssets: mountAssets } = require('../../../server/src/middleware/staticAssets');
    expect(mountAssets).toHaveBeenCalledWith(mockApp, '/dist');
  });

  it('should register SPA fallback', () => {
    registerSpaFallback(mockApp, '/dist');
    expect(mockApp.get).toHaveBeenCalledWith('*', expect.any(Function));
  });
});
