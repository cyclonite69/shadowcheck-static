import { Pool } from 'pg';
import { ObservationLoader } from '../../../../../etl/load/wigle/loader';
import { ValidatedObservation } from '../../../../../etl/load/wigle/types';

describe('wigle/loader', () => {
  let mockPool: Partial<Pool>;
  let loader: ObservationLoader;

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
    };
    loader = new ObservationLoader(mockPool as Pool);
  });

  describe('insertBatch', () => {
    it('returns 0 when records is empty and does not query the pool', async () => {
      const result = await loader.insertBatch([]);
      expect(result).toBe(0);
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('creates query parameters and executes database insert successfully', async () => {
      const records: ValidatedObservation[] = [
        {
          device_id: 'unit_1',
          bssid: 'AA:BB:CC:DD:EE:FF',
          ssid: 'Network1',
          radio_type: 'W',
          radio_frequency: 2412,
          radio_capabilities: '[WPA2]',
          radio_service: 'svc1',
          radio_rcois: 'rc1',
          radio_lasttime_ms: 1234567,
          level: -45,
          lat: 45.123,
          lon: -84.456,
          altitude: 10,
          accuracy: 5,
          time: new Date(1710000000000),
          observed_at_ms: 1710000000000,
          external: false,
          mfgrid: 1,
          source_tag: 'field_unit',
          source_pk: 'pk_1',
          time_ms: 1710000000000,
        },
        {
          device_id: 'unit_2',
          bssid: '11:22:33:44:55:66',
          ssid: 'Network2',
          radio_type: 'W',
          radio_frequency: 2417,
          radio_capabilities: '[WPA3]',
          radio_service: 'svc2',
          radio_rcois: 'rc2',
          radio_lasttime_ms: 1234568,
          level: -50,
          lat: 45.124,
          lon: -84.457,
          altitude: 12,
          accuracy: 6,
          time: new Date(1710000001000),
          observed_at_ms: 1710000001000,
          external: true,
          mfgrid: 2,
          source_tag: 'field_unit',
          source_pk: 'pk_2',
          time_ms: 1710000001000,
        },
      ];

      const count = await loader.insertBatch(records);
      expect(count).toBe(2);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const [sqlCall, paramsCall] = (mockPool.query as jest.Mock).mock.calls[0];

      expect(sqlCall).toContain('INSERT INTO app.observations');
      expect(sqlCall).toContain('ST_SetSRID(ST_MakePoint($13, $12), 4326)');
      expect(sqlCall).toContain('ST_SetSRID(ST_MakePoint($34, $33), 4326)');

      expect(paramsCall).toHaveLength(42);
      expect(paramsCall[0]).toBe('unit_1');
      expect(paramsCall[1]).toBe('AA:BB:CC:DD:EE:FF');
      expect(paramsCall[10]).toBe(45.123);
      expect(paramsCall[11]).toBe(-84.456);

      expect(paramsCall[21]).toBe('unit_2');
      expect(paramsCall[22]).toBe('11:22:33:44:55:66');
      expect(paramsCall[31]).toBe(45.124);
      expect(paramsCall[32]).toBe(-84.457);
    });
  });
});
