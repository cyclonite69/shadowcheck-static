import request from 'supertest';
import express from 'express';

// Define mock container
const mockContainer = {
  observationService: {
    getHomeLocationForObservations: jest.fn(),
    getObservationsByBSSID: jest.fn().mockResolvedValue([]), // Default to empty array
    checkWigleTableExists: jest.fn(),
    getWigleObservationsByBSSID: jest.fn().mockResolvedValue([]),
    getOurObservationCount: jest.fn().mockResolvedValue(0),
    getWigleObservationsBatch: jest.fn().mockResolvedValue([]),
    correlateVisINT: jest.fn(),
    saveVisINTAttachment: jest.fn(),
  },
};

// Mock the container
jest.mock('../../../../server/src/config/container', () => mockContainer);

// Mock logger
jest.mock('../../../../server/src/logging/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  default: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Use commonjs require and handle possible .default from ts-node/esm
const observationsModule = require('../../../../server/src/api/routes/v1/networks/observations');
const observationsRouter = observationsModule.default || observationsModule;

const app = express();
app.use(express.json());
// Mounted at /api
app.use('/api', observationsRouter);

describe('Observations API v1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply defaults after clear
    mockContainer.observationService.getObservationsByBSSID.mockResolvedValue([]);
  });

  describe('GET /api/networks/observations/:bssid', () => {
    it('should return observations for a valid BSSID', async () => {
      const bssid = '00:11:22:33:44:55';
      const mockHome = { lon: -122.4194, lat: 37.7749 };
      const mockObservations = [
        {
          id: 1,
          bssid,
          ssid: 'TestNet',
          lat: 37.775,
          lon: -122.419,
          level: -50,
          time: 1600000000000,
        },
      ];

      mockContainer.observationService.getHomeLocationForObservations.mockResolvedValue(mockHome);
      mockContainer.observationService.getObservationsByBSSID.mockResolvedValue(mockObservations);

      const res = await request(app).get(`/api/networks/observations/${bssid}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.bssid).toBe(bssid);
      expect(res.body.observations).toEqual(mockObservations);
      expect(res.body.home).toEqual(mockHome);
    });

    it('should return 400 for truly invalid BSSID', async () => {
      // Use characters that fail both MAC and alphanumeric validation
      const res = await request(app).get('/api/networks/observations/invalid!bssid');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/networks/:bssid/wigle-observations', () => {
    it('should return WiGLE observations when table exists', async () => {
      const bssid = '00:11:22:33:44:55';
      const mockWigleObs = [
        {
          bssid,
          lat: 37.775,
          lon: -122.419,
          time: 1600000000000,
          level: -60,
          ssid: 'TestNet',
          is_matched: true,
          distance_from_our_center_m: 2.5,
        },
      ];

      mockContainer.observationService.checkWigleTableExists.mockResolvedValue(true);
      mockContainer.observationService.getWigleObservationsByBSSID.mockResolvedValue(mockWigleObs);
      mockContainer.observationService.getOurObservationCount.mockResolvedValue(5);

      const res = await request(app).get(`/api/networks/${bssid}/wigle-observations`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.stats.wigle_total).toBe(1);
    });
  });

  describe('POST /api/observations/correlate-visint', () => {
    it('accepts multipart VISINT image uploads', async () => {
      const image = Buffer.from('fake-visint-image');
      mockContainer.observationService.correlateVisINT.mockResolvedValue({
        status: 'UNMATCHED',
        observation_id: null,
        detection_score: 0,
        dist_meters: null,
        delta_minutes: null,
        tags_applied: [],
        exif: { lat: 1, lon: 2, ts: '2026-06-05T00:00:00.000Z' },
        candidates: [],
      });

      const res = await request(app)
        .post('/api/observations/correlate-visint')
        .attach('image', image, 'visint.jpg')
        .field('filename', 'visint.jpg')
        .field('commit', 'false')
        .field('radius_meters', '75')
        .field('window_hours', '3')
        .field('limit', '7');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      const call = mockContainer.observationService.correlateVisINT.mock.calls[0];
      expect(Buffer.isBuffer(call[0])).toBe(true);
      expect(call[0].equals(image)).toBe(true);
      expect(call.slice(1)).toEqual(['visint.jpg', false, 75, 3, 7]);
    });

    it('defaults commit to false when commit field is omitted — does not write media', async () => {
      const image = Buffer.from('fake-visint-image');
      mockContainer.observationService.correlateVisINT.mockResolvedValue({
        status: 'UNMATCHED',
        observation_id: null,
        detection_score: 0,
        dist_meters: null,
        delta_minutes: null,
        tags_applied: [],
        exif: { lat: 1, lon: 2, ts: '2026-06-05T00:00:00.000Z' },
        candidates: [],
      });

      const res = await request(app)
        .post('/api/observations/correlate-visint')
        .attach('image', image, 'visint.jpg');

      expect(res.status).toBe(200);
      // commit arg passed to service must be false (the default)
      const call = mockContainer.observationService.correlateVisINT.mock.calls[0];
      expect(call[2]).toBe(false);
      // saveVisINTAttachment must never be called on a correlate request
      expect(mockContainer.observationService.saveVisINTAttachment).not.toHaveBeenCalled();
    });

    it('passes commit=true to service when explicitly requested', async () => {
      const image = Buffer.from('fake-visint-image');
      mockContainer.observationService.correlateVisINT.mockResolvedValue({
        status: 'MATCHED',
        observation_id: '99',
        detection_score: 3,
        dist_meters: 5.0,
        delta_minutes: 0.5,
        tags_applied: ['FLOCK_LEGACY', 'VISINT_VERIFIED'],
        exif: { lat: 1, lon: 2, ts: '2026-06-05T00:00:00.000Z' },
        candidates: [],
      });

      const res = await request(app)
        .post('/api/observations/correlate-visint')
        .attach('image', image, 'visint.jpg')
        .field('commit', 'true');

      expect(res.status).toBe(200);
      const call = mockContainer.observationService.correlateVisINT.mock.calls[0];
      expect(call[2]).toBe(true);
    });

    it('returns 413 for VISINT images over the route-specific limit', async () => {
      const oversizedImage = Buffer.alloc(25 * 1024 * 1024 + 1);

      const res = await request(app)
        .post('/api/observations/correlate-visint')
        .attach('image', oversizedImage, 'too-large.jpg');

      expect(res.status).toBe(413);
      expect(res.body).toEqual(
        expect.objectContaining({
          ok: false,
          code: 'PAYLOAD_TOO_LARGE',
        })
      );
      expect(mockContainer.observationService.correlateVisINT).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid VISINT file types (non-image)', async () => {
      const textFile = Buffer.from('some text data');

      const res = await request(app)
        .post('/api/observations/correlate-visint')
        .attach('image', textFile, 'not-an-image.txt');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        ok: false,
        error: 'Invalid file type. Only JPEG and PNG are allowed.',
        code: 'INVALID_FILE_TYPE',
      });
      expect(mockContainer.observationService.correlateVisINT).not.toHaveBeenCalled();
    });

    it('returns 503 when the VISINT EXIF parser is unavailable', async () => {
      const image = Buffer.from('fake-visint-image');
      const error = new Error(
        'VISINT EXIF parser is unavailable. Install exiftool in the API runtime.'
      );
      error.name = 'ExifToolUnavailableError';
      mockContainer.observationService.correlateVisINT.mockRejectedValue(error);

      const res = await request(app)
        .post('/api/observations/correlate-visint')
        .attach('image', image, 'visint.jpg');

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        error: 'VISINT EXIF parser is unavailable. Install exiftool in the API runtime.',
        type: 'ExifToolUnavailableError',
        code: 'VISINT_EXIF_TOOL_UNAVAILABLE',
      });
    });

    it('rejects malformed radius/window/limit on correlate-visint', async () => {
      const image = Buffer.from('fake-visint-image');
      const res = await request(app)
        .post('/api/observations/correlate-visint')
        .attach('image', image, 'visint.jpg')
        .field('radius_meters', 'abc');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VISINT_INVALID_NUMERIC_PARAMS');
      expect(mockContainer.observationService.correlateVisINT).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/observations/attach-visint', () => {
    it('accepts multipart VISINT attachment uploads', async () => {
      const image = Buffer.from('fake-visint-attachment');
      mockContainer.observationService.saveVisINTAttachment.mockResolvedValue(['VISINT_VERIFIED']);

      const res = await request(app)
        .post('/api/observations/attach-visint')
        .attach('image', image, 'visint.jpg')
        .field('filename', 'visint.jpg')
        .field('bssid', 'AA:BB:CC:DD:EE:FF')
        .field('status', 'MATCHED')
        .field('detection_score', '3')
        .field('dist_meters', '12.5')
        .field('delta_minutes', '4.25')
        .field('lat', '39.1')
        .field('lon', '-76.2')
        .field('ts', '2026-06-05T00:00:00.000Z')
        .field('manual_override', 'false');
      // Note: device_type not sent → null on server side

      expect(res.status).toBe(200);
      expect(res.body.tags_applied).toEqual(['VISINT_VERIFIED']);
      const call = mockContainer.observationService.saveVisINTAttachment.mock.calls[0];
      expect(Buffer.isBuffer(call[0])).toBe(true);
      expect(call[0].equals(image)).toBe(true);
      expect(call.slice(1)).toEqual([
        'visint.jpg',
        'AA:BB:CC:DD:EE:FF',
        'MATCHED',
        3,
        12.5,
        4.25,
        39.1,
        -76.2,
        '2026-06-05T00:00:00.000Z',
        false,
        null,
        null,
      ]);
    });

    it('accepts multipart VISINT attachment uploads with observation_id', async () => {
      const image = Buffer.from('fake-visint-attachment-with-obs');
      mockContainer.observationService.saveVisINTAttachment.mockResolvedValue(['VISINT_VERIFIED']);

      const res = await request(app)
        .post('/api/observations/attach-visint')
        .attach('image', image, 'visint.jpg')
        .field('filename', 'visint.jpg')
        .field('bssid', 'AA:BB:CC:DD:EE:FF')
        .field('status', 'MATCHED')
        .field('detection_score', '3')
        .field('dist_meters', '12.5')
        .field('delta_minutes', '4.25')
        .field('lat', '39.1')
        .field('lon', '-76.2')
        .field('ts', '2026-06-05T00:00:00.000Z')
        .field('manual_override', 'false')
        .field('observation_id', '987654');

      expect(res.status).toBe(200);
      expect(res.body.tags_applied).toEqual(['VISINT_VERIFIED']);
      const call = mockContainer.observationService.saveVisINTAttachment.mock.calls[0];
      expect(Buffer.isBuffer(call[0])).toBe(true);
      expect(call[0].equals(image)).toBe(true);
      expect(call.slice(1)).toEqual([
        'visint.jpg',
        'AA:BB:CC:DD:EE:FF',
        'MATCHED',
        3,
        12.5,
        4.25,
        39.1,
        -76.2,
        '2026-06-05T00:00:00.000Z',
        false,
        null,
        '987654',
      ]);
    });

    it('rejects VISINT_UNMATCHED target without confirm_fallback', async () => {
      const image = Buffer.from('fake-visint-attachment');

      const res = await request(app)
        .post('/api/observations/attach-visint')
        .attach('image', image, 'visint.jpg')
        .field('bssid', 'VISINT_UNMATCHED')
        .field('status', 'UNMATCHED');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VISINT_FALLBACK_REQUIRES_CONFIRMATION');
      expect(mockContainer.observationService.saveVisINTAttachment).not.toHaveBeenCalled();
    });

    it('rejects VISINT_UNMATCHED target when confirm_fallback=false', async () => {
      const image = Buffer.from('fake-visint-attachment');

      const res = await request(app)
        .post('/api/observations/attach-visint')
        .attach('image', image, 'visint.jpg')
        .field('bssid', 'VISINT_UNMATCHED')
        .field('confirm_fallback', 'false');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VISINT_FALLBACK_REQUIRES_CONFIRMATION');
      expect(mockContainer.observationService.saveVisINTAttachment).not.toHaveBeenCalled();
    });

    it('allows VISINT_UNMATCHED target when confirm_fallback=true', async () => {
      const image = Buffer.from('fake-visint-attachment');
      mockContainer.observationService.saveVisINTAttachment.mockResolvedValue([
        'UNMATCHED_NODE',
        'VISINT_UNMATCHED',
      ]);

      const res = await request(app)
        .post('/api/observations/attach-visint')
        .attach('image', image, 'visint.jpg')
        .field('bssid', 'VISINT_UNMATCHED')
        .field('status', 'UNMATCHED')
        .field('confirm_fallback', 'true');

      expect(res.status).toBe(200);
      expect(res.body.tags_applied).toEqual(['UNMATCHED_NODE', 'VISINT_UNMATCHED']);
      expect(mockContainer.observationService.saveVisINTAttachment).toHaveBeenCalled();
    });

    it('rejects malformed detection_score instead of passing NaN into saveVisINTAttachment', async () => {
      const image = Buffer.from('fake-visint-attachment');
      const res = await request(app)
        .post('/api/observations/attach-visint')
        .attach('image', image, 'visint.jpg')
        .field('bssid', 'AA:BB:CC:DD:EE:FF')
        .field('detection_score', 'invalid-score');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VISINT_INVALID_DETECTION_SCORE');
      expect(mockContainer.observationService.saveVisINTAttachment).not.toHaveBeenCalled();
    });

    it('rejects malformed lat/lon on attach-visint instead of passing NaN', async () => {
      const image = Buffer.from('fake-visint-attachment');
      const res = await request(app)
        .post('/api/observations/attach-visint')
        .attach('image', image, 'visint.jpg')
        .field('bssid', 'AA:BB:CC:DD:EE:FF')
        .field('lat', 'invalid-lat');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VISINT_INVALID_NUMERIC_PARAMS');
      expect(mockContainer.observationService.saveVisINTAttachment).not.toHaveBeenCalled();
    });
  });
});
