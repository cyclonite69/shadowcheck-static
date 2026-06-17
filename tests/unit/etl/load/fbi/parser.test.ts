import {
  extractPhone,
  isStopLine,
  normalizeStateKey,
  parseCityStateZip,
  stripMarkdown,
} from '../../../../../etl/load/fbi/parser';

describe('etl/load/fbi/parser', () => {
  it('strips markdown control characters without removing content', () => {
    expect(stripMarkdown('**#[Detroit](office)_**')).toBe('Detroitoffice');
  });

  it('normalizes state heading keys and detects stop lines case-insensitively', () => {
    expect(normalizeStateKey('  New   York.  ')).toBe('new york');
    expect(isStopLine('Website and jurisdiction', ['website'])).toBe(true);
    expect(isStopLine('Detroit resident agency', ['website'])).toBe(false);
  });

  it('parses city, state, and ZIP+4 from address lines', () => {
    expect(parseCityStateZip('Grand Rapids, MI 49503-1234')).toEqual({
      city: 'Grand Rapids',
      state: 'MI',
      postalCode: '49503-1234',
    });
    expect(parseCityStateZip('No postal code here')).toEqual({
      city: null,
      state: null,
      postalCode: null,
    });
  });

  it('extracts inline and section phone numbers but stops at new sections', () => {
    expect(extractPhone(['Phone: 313-965-2323'])).toBe('313-965-2323');
    expect(extractPhone(['Phone', '313-555-1212'])).toBe('313-555-1212');
    expect(extractPhone(['Phone', 'Website', '313-555-1212'])).toBeNull();
  });
});
