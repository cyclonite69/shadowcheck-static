// Mock the logger
jest.mock('../../server/src/logging/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

// Mock AWS SDK
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: mockSend,
  })),
  PutObjectCommand: jest.fn(),
  HeadObjectCommand: jest.fn(),
}));

const mockGetSignedUrl = jest.fn().mockResolvedValue('https://mock-presigned-url.com/upload');
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: any[]) => mockGetSignedUrl(...args),
}));

// Mock the Service
const mockRecordUpload = jest.fn().mockResolvedValue(123);
const mockProcessUpload = jest.fn().mockResolvedValue(undefined);

jest.mock('../../server/src/services/mobileIngestService', () => ({
  recordUpload: (...args: any[]) => mockRecordUpload(...args),
  processUpload: (...args: any[]) => mockProcessUpload(...args),
}));

// Use require for the router
const mobileIngestRouter = require('../../server/src/api/routes/v1/mobileIngest').default;

type MockRequest = {
  body: Record<string, unknown>;
  headers: Record<string, string | undefined>;
};

type MockResponse = {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  status: (code: number) => MockResponse;
  json: (payload: any) => MockResponse;
  setHeader: (name: string, value: string) => void;
  getHeader: (name: string) => string | undefined;
};

function getRouteHandler(path: string, method: 'post') {
  const layer = mobileIngestRouter.stack.find(
    (entry: any) => entry.route?.path === path && entry.route.methods?.[method]
  );

  if (!layer) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }

  return layer.route.stack[layer.route.stack.length - 1].handle;
}

async function invokeRoute(
  path: string,
  {
    body = {},
    authorization,
  }: {
    body?: Record<string, unknown>;
    authorization?: string;
  } = {}
) {
  const handler = getRouteHandler(path, 'post');
  const req: MockRequest = {
    body,
    headers: {
      authorization,
    },
  };

  let settled = false;
  let resolveResponse!: (value: MockResponse) => void;
  let rejectResponse!: (reason?: unknown) => void;

  const responsePromise = new Promise<MockResponse>((resolve, reject) => {
    resolveResponse = resolve;
    rejectResponse = reject;
  });

  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      if (!settled) {
        settled = true;
        resolveResponse(this);
      }
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    getHeader(name: string) {
      return this.headers[name.toLowerCase()];
    },
  };

  try {
    await handler(req, res, (err?: unknown) => {
      if (err && !settled) {
        settled = true;
        rejectResponse(err);
        return;
      }

      if (!settled) {
        settled = true;
        resolveResponse(res);
      }
    });
  } catch (err) {
    if (!settled) {
      settled = true;
      rejectResponse(err);
    }
  }

  const response = await responsePromise;
  return {
    status: response.statusCode,
    body: response.body,
    headers: response.headers,
  };
}

describe('Mobile Ingest API', () => {
  const API_KEY = 'test-secret-key';

  beforeAll(() => {
    process.env.SHADOWCHECK_API_KEY = API_KEY;
    process.env.S3_BACKUP_BUCKET = 'test-bucket';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue('https://mock-presigned-url.com/upload');
    mockRecordUpload.mockResolvedValue(123);
    process.env.ALLOW_MOBILE_INGEST_AUTO_PROCESS = 'false';
  });

  describe('POST /api/v1/ingest/request-upload', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const response = await invokeRoute('/request-upload', {
        body: { fileName: 'test.sqlite' },
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Missing or invalid Authorization header');
    });

    it('should return 401 if API key is invalid', async () => {
      const response = await invokeRoute('/request-upload', {
        authorization: 'Bearer wrong-key',
        body: { fileName: 'test.sqlite' },
      });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 400 if fileName is missing', async () => {
      const response = await invokeRoute('/request-upload', {
        authorization: `Bearer ${API_KEY}`,
        body: { case_id: 'test-case' },
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('fileName is required');
    });

    it('should return 400 if filesize exceeds limit', async () => {
      const response = await invokeRoute('/request-upload', {
        authorization: `Bearer ${API_KEY}`,
        body: { fileName: 'test.sqlite', filesize: 600 * 1024 * 1024 },
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('File size exceeds 500MB limit');
    });

    it('should return 200 and presigned URL data on success', async () => {
      const response = await invokeRoute('/request-upload', {
        authorization: `Bearer ${API_KEY}`,
        body: { fileName: 'test.sqlite', case_id: 'case123' },
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('uploadUrl', 'https://mock-presigned-url.com/upload');
      expect(response.body).toHaveProperty('s3Key');
      expect(response.body.s3Key).toMatch(/^uploads\/case123\/\d{8}\/.*-test.sqlite$/);
      expect(response.body).toHaveProperty('uploadId');
      expect(response.body).toHaveProperty('expires_at');
    });
  });

  describe('POST /api/v1/ingest/complete', () => {
    it('should return 401 if unauthorized', async () => {
      const response = await invokeRoute('/complete', {
        body: { uploadId: 'uuid', s3Key: 'path/to/obj' },
      });

      expect(response.status).toBe(401);
    });

    it('should return 400 if s3Key is missing', async () => {
      const response = await invokeRoute('/complete', {
        authorization: `Bearer ${API_KEY}`,
        body: { uploadId: 'uuid' },
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('s3Key is required');
    });

    it('should return 404 if file does not exist in S3', async () => {
      const notFoundError = new Error('Not Found');
      (notFoundError as any).$metadata = { httpStatusCode: 404 };
      mockSend.mockRejectedValueOnce(notFoundError);

      const response = await invokeRoute('/complete', {
        authorization: `Bearer ${API_KEY}`,
        body: { uploadId: 'uuid', s3Key: 'missing/path' },
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Upload not found in S3 storage');
    });

    it('should return 200 and record upload if file exists in S3', async () => {
      mockSend.mockResolvedValueOnce({}); // HeadObject success
      mockRecordUpload.mockResolvedValueOnce(123);

      const response = await invokeRoute('/complete', {
        authorization: `Bearer ${API_KEY}`,
        body: {
          uploadId: 'uuid',
          s3Key: 'valid/path',
          deviceModel: 'S22 Ultra',
          deviceId: 'my-s22',
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('quarantined');
      expect(response.body.queuedForProcessing).toBe(false);
      expect(response.body.dbId).toBe(123);
      expect(mockRecordUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          s3Key: 'valid/path',
          sourceTag: 'my-s22',
          status: 'quarantined',
          deviceModel: 'S22 Ultra',
          deviceId: 'my-s22',
          extraMetadata: expect.objectContaining({
            provenance: expect.objectContaining({
              trustMode: 'untrusted',
              manualBackupConfirmed: false,
              autoProcessEnabled: false,
            }),
          }),
        })
      );
      expect(mockProcessUpload).not.toHaveBeenCalled();
    });

    it('should quarantine untrusted uploads after S3 verification', async () => {
      mockSend.mockResolvedValueOnce({});
      mockRecordUpload.mockResolvedValueOnce(42);

      const response = await invokeRoute('/complete', {
        authorization: `Bearer ${API_KEY}`,
        body: {
          uploadId: 'uuid',
          s3Key: 'uploads/test/u1.sqlite',
          sourceTag: 'android_test',
          deviceId: 'device-1',
          trustMode: 'test_untrusted',
          manualBackupConfirmed: false,
          extraMetadata: { packageName: 'net.shadowcheck.collector' },
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('quarantined');
      expect(response.body.queuedForProcessing).toBe(false);
      expect(response.body.dbId).toBe(42);
      expect(mockRecordUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'quarantined',
          sourceTag: 'android_test',
          extraMetadata: expect.objectContaining({
            packageName: 'net.shadowcheck.collector',
            provenance: expect.objectContaining({
              trustMode: 'test_untrusted',
              manualBackupConfirmed: false,
              autoProcessEnabled: false,
            }),
          }),
        })
      );
      expect(mockProcessUpload).not.toHaveBeenCalled();
    });

    it('should queue trusted uploads only when backup is confirmed and auto-process is enabled', async () => {
      process.env.ALLOW_MOBILE_INGEST_AUTO_PROCESS = 'true';
      mockSend.mockResolvedValueOnce({});
      mockRecordUpload.mockResolvedValueOnce(42);

      const response = await invokeRoute('/complete', {
        authorization: `Bearer ${API_KEY}`,
        body: {
          uploadId: 'uuid',
          s3Key: 'uploads/test/u2.sqlite',
          sourceTag: 'android_trusted',
          deviceId: 'device-2',
          trustMode: 'trusted',
          manualBackupConfirmed: true,
        },
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('queued');
      expect(response.body.queuedForProcessing).toBe(true);
      expect(response.body.dbId).toBe(42);
      expect(mockRecordUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'queued',
          extraMetadata: expect.objectContaining({
            provenance: expect.objectContaining({
              trustMode: 'trusted',
              manualBackupConfirmed: true,
              autoProcessEnabled: true,
            }),
          }),
        })
      );
      expect(mockProcessUpload).toHaveBeenCalledWith(42);
    });
  });
});
