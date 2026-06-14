import express from 'express';
import request from 'supertest';

const mockBackupService = {
  runPostgresBackup: jest.fn(),
  listS3Backups: jest.fn(),
  deleteS3Backup: jest.fn(),
};

jest.mock('../../server/src/config/container', () => ({
  backupService: mockBackupService,
}));

jest.mock('../../server/src/logging/logger', () => ({
  error: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api', require('../../server/src/api/routes/v1/admin/backup'));

describe('admin backup routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('runs a database backup with the requested upload option', async () => {
    mockBackupService.runPostgresBackup.mockResolvedValue({ file: 'backup.sql' });

    const response = await request(app).post('/api/admin/backup').send({ uploadToS3: true });

    expect(response.body).toEqual({ ok: true, file: 'backup.sql' });
    expect(mockBackupService.runPostgresBackup).toHaveBeenCalledWith({ uploadToS3: true });
  });

  it('reports backup failures', async () => {
    mockBackupService.runPostgresBackup.mockRejectedValue(new Error('pg_dump failed'));

    const response = await request(app).post('/api/admin/backup');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('pg_dump failed');
  });

  it('lists S3 backups', async () => {
    mockBackupService.listS3Backups.mockResolvedValue([{ key: 'backups/a.sql' }]);

    const response = await request(app).get('/api/admin/backup/s3');

    expect(response.body).toEqual({ ok: true, backups: [{ key: 'backups/a.sql' }] });
  });

  it('treats an unconfigured S3 bucket as a valid empty state', async () => {
    mockBackupService.listS3Backups.mockRejectedValue(
      new Error('S3_BACKUP_BUCKET is not configured')
    );

    const response = await request(app).get('/api/admin/backup/s3');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, configured: false, backups: [] });
  });

  it('keeps local S3 listing failures non-fatal', async () => {
    mockBackupService.listS3Backups.mockRejectedValue(new Error('credentials unavailable'));

    const response = await request(app).get('/api/admin/backup/s3');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('credentials unavailable');
  });

  it('returns production S3 listing failures', async () => {
    process.env.NODE_ENV = 'production';
    mockBackupService.listS3Backups.mockRejectedValue(new Error('S3 failed'));

    const response = await request(app).get('/api/admin/backup/s3');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('S3 failed');
  });

  it('rejects keys outside the backup prefix', async () => {
    const response = await request(app).delete('/api/admin/backup/s3/not-a-backup');

    expect(response.status).toBe(400);
    expect(mockBackupService.deleteS3Backup).not.toHaveBeenCalled();
  });

  it('deletes a valid backup key', async () => {
    mockBackupService.deleteS3Backup.mockResolvedValue({ deleted: true });

    const response = await request(app).delete('/api/admin/backup/s3/backups/folder/file.sql');

    expect(response.body).toEqual({ ok: true, deleted: true });
    expect(mockBackupService.deleteS3Backup).toHaveBeenCalledWith('backups/folder/file.sql');
  });

  it('reports delete failures', async () => {
    mockBackupService.deleteS3Backup.mockRejectedValue(new Error('delete failed'));

    const response = await request(app).delete('/api/admin/backup/s3/backups/file.sql');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('delete failed');
  });
});
