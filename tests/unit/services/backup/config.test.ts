import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import {
  getBackupSource,
  getBackupDir,
  stamp,
  getConfiguredS3BackupBucket,
} from '../../../../server/src/services/backup/config';

jest.mock('os', () => ({
  hostname: jest.fn(),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('backup config Service', () => {
  const originalEnv = process.env;
  const mockHostname = os.hostname as jest.Mock;
  const mockExecSync = execSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getBackupSource()', () => {
    it('returns configured environment and instance if BACKUP_SOURCE_ENV is set', () => {
      process.env.BACKUP_SOURCE_ENV = 'staging';
      process.env.EC2_INSTANCE_ID = 'i-111111111';
      mockHostname.mockReturnValue('test-host');

      const result = getBackupSource();
      expect(result).toEqual({
        hostname: 'test-host',
        environment: 'staging',
        instanceId: 'i-111111111',
      });
    });

    it('prefers IMDSv2 metadata if available', () => {
      mockHostname.mockReturnValue('test-host');
      mockExecSync.mockReturnValue('i-222222222\n');

      const result = getBackupSource();
      expect(result).toEqual({
        hostname: 'test-host',
        environment: 'aws-ec2',
        instanceId: 'i-222222222',
      });
    });

    it('falls back to hostname endsWith heuristics if IMDSv2 fails', () => {
      mockHostname.mockReturnValue('ip-10-0-0-1.ec2.internal');
      mockExecSync.mockImplementation(() => {
        throw new Error('IMDS connection timeout');
      });

      const result = getBackupSource();
      expect(result).toEqual({
        hostname: 'ip-10-0-0-1.ec2.internal',
        environment: 'aws-ec2',
      });
    });

    it('defaults to local environment if IMDS and heuristics both fail', () => {
      mockHostname.mockReturnValue('my-laptop');
      mockExecSync.mockImplementation(() => {
        throw new Error('IMDS fail');
      });

      const result = getBackupSource();
      expect(result).toEqual({
        hostname: 'my-laptop',
        environment: 'local',
      });
    });
  });

  describe('getBackupDir()', () => {
    it('returns absolute backup path if BACKUP_DIR is absolute', () => {
      process.env.BACKUP_DIR = '/custom/absolute/path';
      const result = getBackupDir();
      expect(result).toBe('/custom/absolute/path');
    });

    it('returns resolved absolute path if BACKUP_DIR is relative', () => {
      process.env.BACKUP_DIR = 'relative/backups';
      const result = getBackupDir();
      expect(result).toBe(path.resolve('/app', 'relative/backups'));
    });

    it('returns default backup path if BACKUP_DIR is missing', () => {
      delete process.env.BACKUP_DIR;
      const result = getBackupDir();
      expect(result).toBe('/app/backups/db');
    });
  });

  describe('stamp()', () => {
    it('returns a formatted date-time stamp string', () => {
      const result = stamp();
      expect(result).toMatch(/^\d{8}-\d{6}$/);
    });
  });

  describe('getConfiguredS3BackupBucket()', () => {
    it('returns S3_BACKUP_BUCKET if configured', () => {
      process.env.S3_BACKUP_BUCKET = 'my-s3-bucket';
      const result = getConfiguredS3BackupBucket();
      expect(result).toBe('my-s3-bucket');
    });

    it('throws an error if S3_BACKUP_BUCKET is empty or missing', () => {
      delete process.env.S3_BACKUP_BUCKET;
      expect(() => getConfiguredS3BackupBucket()).toThrow('S3_BACKUP_BUCKET is not configured');
    });
  });
});
