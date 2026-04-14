import { EventEmitter } from 'events';

// Mock child_process.spawn
const mockSpawn = jest.fn();
jest.mock('child_process', () => ({
  spawn: (...args: any[]) => mockSpawn(...args),
}));

// Mock fs
const mockFsPromises = {
  access: jest.fn(),
};
jest.mock('fs', () => ({
  promises: mockFsPromises,
}));

// Mock os
const mockOs = {
  hostname: jest.fn(),
};
jest.mock('os', () => mockOs);

describe('pgAdmin runtime', () => {
  let runtime: any;

  function createMockChild() {
    const child = new EventEmitter() as any;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = new EventEmitter();
    return child;
  }

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Default environment for tests
    process.env.DB_HOST = 'localhost';
    process.env.NODE_ENV = 'test';
    process.env.PGADMIN_PORT = '5050';

    mockOs.hostname.mockReturnValue('test-host');
    mockFsPromises.access.mockResolvedValue(undefined);

    // Default mock for spawn to prevent hangs
    mockSpawn.mockImplementation(() => {
      const child = createMockChild();
      setImmediate(() => child.emit('close', 0));
      return child;
    });

    // Import runtime after setting env
    runtime = require('../../../../server/src/services/pgadmin/runtime');
  });

  const mockSpawnProcess = (code: number, stdout = '', stderr = '') => {
    const child = createMockChild();
    mockSpawn.mockReturnValueOnce(child);

    setImmediate(() => {
      if (stdout) child.stdout.emit('data', Buffer.from(stdout));
      if (stderr) child.stderr.emit('data', Buffer.from(stderr));
      child.emit('close', code);
    });

    return child;
  };

  describe('runCommand', () => {
    it('should resolve on success (code 0)', async () => {
      mockSpawnProcess(0, 'success output', '');
      const result = await runtime.runCommand('test-cmd', ['arg1']);

      expect(result).toEqual({
        code: 0,
        stdout: 'success output',
        stderr: '',
      });
      expect(mockSpawn).toHaveBeenCalledWith('test-cmd', ['arg1'], expect.any(Object));
    });

    it('should reject on non-zero code', async () => {
      mockSpawnProcess(1, '', 'error message');
      await expect(runtime.runCommand('test-cmd', [])).rejects.toThrow('error message');
    });

    it('should resolve on non-zero code if allowFail is true', async () => {
      mockSpawnProcess(1, 'partial output', 'error message');
      const result = await runtime.runCommand('test-cmd', [], { allowFail: true });

      expect(result).toEqual({
        code: 1,
        stdout: 'partial output',
        stderr: 'error message',
      });
    });
  });

  describe('composeFileExists', () => {
    it('should return true if fs.access succeeds', async () => {
      mockFsPromises.access.mockResolvedValueOnce(undefined);
      const exists = await runtime.composeFileExists();
      expect(exists).toBe(true);
    });

    it('should return false if fs.access fails', async () => {
      mockFsPromises.access.mockRejectedValueOnce(new Error('ENOENT'));
      const exists = await runtime.composeFileExists();
      expect(exists).toBe(false);
    });
  });

  describe('runCompose', () => {
    it('should throw error if compose file missing', async () => {
      mockFsPromises.access.mockRejectedValue(new Error('ENOENT'));
      await expect(runtime.runCompose(['up'])).rejects.toThrow(/Compose file not found/);
    });

    it('should call docker-compose by default', async () => {
      mockFsPromises.access.mockResolvedValue(undefined);
      mockSpawnProcess(0, 'compose output', '');

      const result = await runtime.runCompose(['up']);
      expect(result.stdout).toBe('compose output');
      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        expect.arrayContaining(['up']),
        expect.any(Object)
      );
    });
  });

  describe('parseDockerStatus', () => {
    it('should return exists:false if stdout is empty', () => {
      const status = runtime.parseDockerStatus('');
      expect(status.exists).toBe(false);
    });

    it('should parse running container correctly', () => {
      const stdout = 'id123||name123||Up 2 hours||0.0.0.0:5050->5050/tcp';
      const status = runtime.parseDockerStatus(stdout);
      expect(status.running).toBe(true);
      expect(status.id).toBe('id123');
    });
  });

  describe('probePgAdminReachable', () => {
    it('should return true if curl returns HTTP 200', async () => {
      mockSpawnProcess(0, 'HTTP/1.1 200 OK', '');
      const reachable = await runtime.probePgAdminReachable();
      expect(reachable).toBe(true);
    });
  });

  describe('removePgAdminContainer', () => {
    it('should stop and rm container in non-local mode', async () => {
      mockFsPromises.access.mockResolvedValue(undefined);
      mockSpawnProcess(0); // stop
      mockSpawnProcess(0); // rm compose
      mockSpawnProcess(0); // rm docker

      await runtime.removePgAdminContainer();

      expect(mockSpawn).toHaveBeenCalledWith(
        'docker-compose',
        expect.arrayContaining(['stop']),
        expect.any(Object)
      );
      expect(mockSpawn).toHaveBeenCalledWith(
        'docker',
        expect.arrayContaining(['rm', '-f']),
        expect.any(Object)
      );
    });
  });
});
