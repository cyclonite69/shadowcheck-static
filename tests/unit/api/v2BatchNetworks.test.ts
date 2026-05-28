export {};

const express = require('express');
const request = require('supertest');

jest.mock('../../../server/src/logging/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock the container/v2Service
const mockGetNetworksByBssids = jest.fn();
const mockCheckNetworksExist = jest.fn();

jest.mock('../../../server/src/config/container', () => ({
  v2Service: {
    getNetworksByBssids: (...args: any[]) => mockGetNetworksByBssids(...args),
    checkNetworksExist: (...args: any[]) => mockCheckNetworksExist(...args),
  },
}));

describe('POST /api/v2/networks/batch route', () => {
  let app: any;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', require('../../../server/src/api/routes/v2/networks'));
  });

  beforeEach(() => {
    mockGetNetworksByBssids.mockReset();
    mockCheckNetworksExist.mockReset();
  });

  test('successfully processes batch lookup with valid BSSIDs and classifies missing', async () => {
    const mockRows = [
      { bssid: '00:11:22:33:44:55', ssid: 'Net1' },
      { bssid: 'AA:BB:CC:DD:EE:FF', ssid: 'Net2' },
    ];
    mockGetNetworksByBssids.mockResolvedValue(mockRows);
    mockCheckNetworksExist.mockResolvedValue(['54:D7:E3:FB:49:C1']);

    const res = await request(app)
      .post('/api/v2/networks/batch')
      .send({
        bssids: [
          '00:11:22:33:44:55',
          'AA:BB:CC:DD:EE:FF',
          '54:D7:E3:FB:49:C1',
          '99:99:99:99:99:99',
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(mockRows);
    expect(res.body.unresolved).toEqual({
      '54:D7:E3:FB:49:C1': 'non_renderable',
      '99:99:99:99:99:99': 'missing',
    });
    expect(mockGetNetworksByBssids).toHaveBeenCalledWith(
      ['00:11:22:33:44:55', 'AA:BB:CC:DD:EE:FF', '54:D7:E3:FB:49:C1', '99:99:99:99:99:99'],
      'latest_observation'
    );
    expect(mockCheckNetworksExist).toHaveBeenCalledWith(['54:D7:E3:FB:49:C1', '99:99:99:99:99:99']);
  });

  test('normalizes and dedupes BSSIDs', async () => {
    mockGetNetworksByBssids.mockResolvedValue([]);
    mockCheckNetworksExist.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v2/networks/batch')
      .send({ bssids: ['aa:bb:cc:dd:ee:ff', 'AA:BB:CC:DD:EE:FF', '  aa:bb:cc:dd:ee:ff  '] });

    expect(res.status).toBe(200);
    expect(mockGetNetworksByBssids).toHaveBeenCalledWith(
      ['AA:BB:CC:DD:EE:FF'],
      'latest_observation'
    );
  });

  test('caps the batch size at 500 BSSIDs', async () => {
    mockGetNetworksByBssids.mockResolvedValue([]);
    mockCheckNetworksExist.mockResolvedValue([]);

    const largeBssidsList = Array.from({ length: 600 }, (_, i) => {
      const hex5 = Math.floor(i / 256)
        .toString(16)
        .padStart(2, '0');
      const hex6 = (i % 256).toString(16).padStart(2, '0');
      return `00:11:22:33:${hex5}:${hex6}`.toUpperCase();
    });

    const res = await request(app).post('/api/v2/networks/batch').send({ bssids: largeBssidsList });

    expect(res.status).toBe(200);
    expect(mockGetNetworksByBssids.mock.calls[0][0].length).toBe(500);
  });

  test('validates and filters out malformed BSSIDs', async () => {
    mockGetNetworksByBssids.mockResolvedValue([]);
    mockCheckNetworksExist.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/v2/networks/batch')
      .send({ bssids: ['invalid-bssid', 'AA:BB:CC:DD:EE:FF', '12:34:56'] });

    expect(res.status).toBe(200);
    expect(mockGetNetworksByBssids).toHaveBeenCalledWith(
      ['AA:BB:CC:DD:EE:FF'],
      'latest_observation'
    );
  });

  test('handles empty body gracefully', async () => {
    mockGetNetworksByBssids.mockResolvedValue([]);
    mockCheckNetworksExist.mockResolvedValue([]);

    const res = await request(app).post('/api/v2/networks/batch').send({});

    expect(res.status).toBe(200);
    expect(mockGetNetworksByBssids).toHaveBeenCalledWith([], 'latest_observation');
  });
});
