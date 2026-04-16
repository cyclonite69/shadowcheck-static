import { startServer } from '../../../server/src/utils/serverStartup';

describe('serverStartup', () => {
  it('should start the app and log details', () => {
    const mockApp: any = {
      listen: jest.fn((port, host, cb) => {
        cb();
        return { port, host };
      }),
    };
    const mockLogger: any = { info: jest.fn() };
    const options: any = {
      port: 3000,
      host: '0.0.0.0',
      forceHttps: true,
      allowedOrigins: ['*'],
      logger: mockLogger,
    };

    const server = startServer(mockApp, options);

    expect(mockApp.listen).toHaveBeenCalledWith(3000, '0.0.0.0', expect.any(Function));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('3000'));
    expect(server).toBeDefined();
  });
});
