import { normalizeState } from '../../../../../etl/load/fbi/transformer';

describe('etl/load/fbi/transformer', () => {
  it('normalizes full state names and preserves unknown values as uppercase', () => {
    expect(normalizeState('new york')).toBe('NY');
    expect(normalizeState('  Michigan  ')).toBe('MI');
    expect(normalizeState('Puerto Rico')).toBe('PUERTO RICO');
  });
});
