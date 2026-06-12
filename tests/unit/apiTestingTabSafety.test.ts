import fs from 'fs';
import path from 'path';
import {
  AUTOMATED_API_PRESETS,
  MANUAL_API_PRESETS,
} from '../../client/src/components/admin/hooks/apiTestingPresets';

describe('API Test Page safety buckets', () => {
  test('wires separate automated and operator-manual preset sections', () => {
    const tabSource = fs.readFileSync(
      path.resolve(process.cwd(), 'client/src/components/admin/tabs/ApiTestingTab.tsx'),
      'utf8'
    );
    const hookSource = fs.readFileSync(
      path.resolve(process.cwd(), 'client/src/components/admin/hooks/useApiTesting.ts'),
      'utf8'
    );

    expect(AUTOMATED_API_PRESETS.length).toBeGreaterThan(0);
    expect(MANUAL_API_PRESETS.length).toBeGreaterThan(0);
    expect(tabSource).toContain('title="Automated Presets"');
    expect(tabSource).toContain('title="Manual / Destructive / External-Effect Endpoints"');
    expect(tabSource).toContain('These presets are never included in bulk verification.');
    expect(tabSource).toContain('AUTOMATED_API_PRESETS.map');
    expect(tabSource).toContain('MANUAL_API_PRESETS.map');
    expect(hookSource).toContain('for (const preset of AUTOMATED_API_PRESETS)');
    expect(hookSource).not.toContain('for (const preset of API_PRESETS)');
    expect(tabSource).not.toContain('Include Destructive Tests');
  });
});
