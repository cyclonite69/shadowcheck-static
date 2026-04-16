import { registerShutdownHandlers } from '../../../server/src/utils/shutdownHandlers';

jest.mock('../../../server/src/services/backgroundJobsService', () => ({
  shutdown: jest.fn()
}));

jest.mock('../../../server/src/websocket/ssmTerminal', () => ({
  shutdownSsmWebSocket: jest.fn().mockResolvedValue(undefined)
}));

describe('shutdownHandlers', () => {
  const originalOn = process.on;
  const originalEmit = process.emit;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { return undefined as never; });
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  it('should register handlers and handle SIGTERM/SIGINT', async () => {
    const mockLogger: any = { info: jest.fn() };
    const mockPool: any = { end: jest.fn().mockResolvedValue(undefined) };
    
    registerShutdownHandlers({ logger: mockLogger, pool: mockPool });

    // Verify registration
    expect(process.listenerCount('SIGTERM')).toBeGreaterThan(0);
    expect(process.listenerCount('SIGINT')).toBeGreaterThan(0);
  });

  it('should shut down gracefully on SIGTERM', async () => {
    const mockLogger: any = { info: jest.fn() };
    const mockPool: any = { end: jest.fn().mockResolvedValue(undefined) };
    const BackgroundJobsService = require('../../../server/src/services/backgroundJobsService');
    const { shutdownSsmWebSocket } = require('../../../server/src/websocket/ssmTerminal');

    registerShutdownHandlers({ logger: mockLogger, pool: mockPool });

    // Directly call the handler for SIGTERM
    const termHandler = process.listeners('SIGTERM')[process.listeners('SIGTERM').length - 1] as any;
    await termHandler();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('SIGTERM received'));
    expect(BackgroundJobsService.shutdown).toHaveBeenCalled();
    expect(shutdownSsmWebSocket).toHaveBeenCalled();
    expect(mockPool.end).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should shut down gracefully on SIGINT', async () => {
    const mockLogger: any = { info: jest.fn() };
    const mockPool: any = { end: jest.fn().mockResolvedValue(undefined) };
    const { shutdownSsmWebSocket } = require('../../../server/src/websocket/ssmTerminal');

    registerShutdownHandlers({ logger: mockLogger, pool: mockPool });

    // Directly call the handler for SIGINT
    const intHandler = process.listeners('SIGINT')[process.listeners('SIGINT').length - 1] as any;
    await intHandler();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('SIGINT received'));
    expect(shutdownSsmWebSocket).toHaveBeenCalled();
    expect(mockPool.end).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
