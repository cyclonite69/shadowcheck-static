import { Pool } from 'pg';
import { OfficeLoader } from '../../../../../etl/load/fbi/loader';
import { OfficeRecord } from '../../../../../etl/load/fbi/types';

describe('fbi/loader', () => {
  let mockPool: Partial<Pool>;
  let loader: OfficeLoader;

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
    };
    loader = new OfficeLoader(mockPool as Pool);
  });

  describe('upsertOffice', () => {
    it('executes database query with mapped office parameters', async () => {
      const office: OfficeRecord = {
        agency: 'FBI',
        officeType: 'field_office',
        name: 'Detroit Field Office',
        parentOffice: 'FBI Headquarters',
        addressLine1: '477 Michigan Ave',
        addressLine2: 'Suite 2600',
        city: 'Detroit',
        state: 'MI',
        postalCode: '48226',
        phone: '313-965-2323',
        website: 'https://fbi.gov/detroit',
        jurisdiction: 'Michigan',
        latitude: 42.3314,
        longitude: -83.0458,
        sourceUrl: 'https://fbi.gov/detroit-contact',
        sourceRetrievedAt: new Date(1710000000000),
      };

      await loader.upsertOffice(office);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];

      expect(sql).toContain('INSERT INTO app.agency_offices');
      expect(sql).toContain('ON CONFLICT (agency, name) DO UPDATE SET');
      expect(params).toEqual([
        'FBI',
        'field_office',
        'Detroit Field Office',
        'FBI Headquarters',
        '477 Michigan Ave',
        'Suite 2600',
        'Detroit',
        'MI',
        '48226',
        '313-965-2323',
        'https://fbi.gov/detroit',
        'Michigan',
        42.3314,
        -83.0458,
        'https://fbi.gov/detroit-contact',
        office.sourceRetrievedAt,
      ]);
    });

    it('falls back to null for missing optional properties', async () => {
      const office: OfficeRecord = {
        agency: 'FBI',
        officeType: 'resident_agency',
        name: 'Alpena Resident Agency',
        sourceUrl: 'https://fbi.gov/detroit-contact',
        sourceRetrievedAt: new Date(1710000000000),
      };

      await loader.upsertOffice(office);

      expect(mockPool.query).toHaveBeenCalledTimes(1);
      const [, params] = (mockPool.query as jest.Mock).mock.calls[0];

      expect(params).toEqual([
        'FBI',
        'resident_agency',
        'Alpena Resident Agency',
        null, // parentOffice
        null, // addressLine1
        null, // addressLine2
        null, // city
        null, // state
        null, // postalCode
        null, // phone
        null, // website
        null, // jurisdiction
        null, // latitude
        null, // longitude
        'https://fbi.gov/detroit-contact',
        office.sourceRetrievedAt,
      ]);
    });
  });
});
