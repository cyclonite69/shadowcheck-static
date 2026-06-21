import fs from 'fs';
import path from 'path';

describe('useGeospatialOverlayOrchestration hook structure', () => {
  const filePath = path.resolve(
    process.cwd(),
    'client/src/components/geospatial/hooks/useGeospatialOverlayOrchestration.ts'
  );
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(filePath, 'utf8');
  });

  test('imports required sub-hooks', () => {
    expect(source).toContain("import { useNetworkContextMenu } from './useNetworkContextMenu'");
    expect(source).toContain("import { useNetworkNotes } from './useNetworkNotes'");
    expect(source).toContain("import { useTimeFrequencyModal } from './useTimeFrequencyModal'");
  });

  test('accepts correct input options signature', () => {
    expect(source).toContain('logError');
    expect(source).toContain('resetPagination');
  });

  test('composes and returns nested hook states', () => {
    expect(source).toContain('...contextMenuState');
    expect(source).toContain('...notesState');
    expect(source).toContain('...timeFreqState');
  });
});
