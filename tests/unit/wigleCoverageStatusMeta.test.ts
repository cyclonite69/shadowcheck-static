import { getCoverageStatusMeta } from '../../client/src/components/admin/tabs/wigleCoverageStatusMeta';

describe('getCoverageStatusMeta', () => {
  it('renders paused distinctly from active processing', () => {
    expect(getCoverageStatusMeta('paused', 12)).toEqual(
      expect.objectContaining({
        className: 'text-amber-300 bg-amber-500/10',
        label: '⏸ Paused',
        title: 'Paused',
      })
    );
  });

  it('renders cancelled distinctly from active processing', () => {
    expect(getCoverageStatusMeta('cancelled', 0)).toEqual(
      expect.objectContaining({
        className: 'text-slate-300 bg-slate-500/10',
        label: '✕ Cancelled',
        title: 'Cancelled',
      })
    );
  });
});
