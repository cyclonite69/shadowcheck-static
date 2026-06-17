import { ImportService } from '../../../../server/src/services/admin/importService';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('../../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('ImportService', () => {
  let importService: ImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    importService = new ImportService();
  });

  describe('runImportCommand', () => {
    it('successfully runs a command and returns result', async () => {
      const mockProcess: any = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const promise = importService.runImportCommand('ls', ['-l']);

      // Simulate output
      mockProcess.stdout.emit('data', Buffer.from('file1\n'));
      mockProcess.stderr.emit('data', Buffer.from('some warning'));
      mockProcess.emit('close', 0);

      const result = await promise;

      expect(result).toEqual({
        code: 0,
        stdout: 'file1\n',
        stderr: 'some warning',
      });
      expect(spawn).toHaveBeenCalledWith('ls', ['-l'], expect.any(Object));
    });

    it('handles non-zero exit codes', async () => {
      const mockProcess: any = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const promise = importService.runImportCommand('false', []);
      mockProcess.emit('close', 1);

      const result = await promise;
      expect(result.code).toBe(1);
    });

    it('handles null exit code by defaulting to 0', async () => {
      const mockProcess: any = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      (spawn as jest.Mock).mockReturnValue(mockProcess);

      const promise = importService.runImportCommand('test', []);
      mockProcess.emit('close', null);

      const result = await promise;
      expect(result.code).toBe(0);
    });
  });

  describe('runParallelImports', () => {
    it('runs multiple commands in parallel', async () => {
      const mockProcess1: any = new EventEmitter();
      mockProcess1.stdout = new EventEmitter();
      mockProcess1.stderr = new EventEmitter();

      const mockProcess2: any = new EventEmitter();
      mockProcess2.stdout = new EventEmitter();
      mockProcess2.stderr = new EventEmitter();

      (spawn as jest.Mock).mockReturnValueOnce(mockProcess1).mockReturnValueOnce(mockProcess2);

      const promise = importService.runParallelImports([
        { cmd: 'echo', args: ['1'] },
        { cmd: 'echo', args: ['2'] },
      ]);

      mockProcess1.stdout.emit('data', Buffer.from('result1'));
      mockProcess1.emit('close', 0);
      mockProcess2.stdout.emit('data', Buffer.from('result2'));
      mockProcess2.emit('close', 0);

      const results = await promise;

      expect(results).toHaveLength(2);
      expect(results[0].stdout).toBe('result1');
      expect(results[1].stdout).toBe('result2');
    });
  });
});
