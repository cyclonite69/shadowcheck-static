import fs from 'fs';
import path from 'path';

describe('GeospatialExplorer component structure', () => {
  const filePath = path.resolve(process.cwd(), 'client/src/components/GeospatialExplorer.tsx');
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(filePath, 'utf8');
  });

  test('imports all required layout components and hooks', () => {
    expect(source).toContain("import { GeospatialLayout } from './geospatial/GeospatialLayout'");
    expect(source).toContain(
      "import { GeospatialFiltersPanel } from './geospatial/panels/GeospatialFiltersPanel'"
    );
    expect(source).toContain(
      "import { GeospatialMapContent } from './geospatial/GeospatialMapContent'"
    );
    expect(source).toContain(
      "import { GeospatialTableContent } from './geospatial/GeospatialTableContent'"
    );
    expect(source).toContain(
      "import { GeospatialOverlayContent } from './geospatial/overlays/GeospatialOverlayContent'"
    );
    expect(source).toContain(
      "import { MapRadiusContextMenu } from './geospatial/MapRadiusContextMenu'"
    );

    // Hook imports
    expect(source).toContain('usePageFilters');
    expect(source).toContain('useAuth');
    expect(source).toContain('useAdminRuntimeConfig');
    expect(source).toContain('useNetworkData');
    expect(source).toContain('useNetworkContextMenu');
    expect(source).toContain('useNetworkSelection');
    expect(source).toContain('useObservations');
    expect(source).toContain('useGeospatialExplorerState');
    expect(source).toContain('useNearestAgencies');
    expect(source).toContain('useNearestCourthouses');
    expect(source).toContain('useNetworkNotes');
    expect(source).toContain('useTimeFrequencyModal');
    expect(source).toContain('useAgencyLayer');
    expect(source).toContain('useFederalCourthouses');
  });

  test('wires the page layout and passes required state and callbacks to child components', () => {
    // GeospatialLayout wiring
    expect(source).toContain('<GeospatialLayout');
    expect(source).toContain('filtersOpen={state.filtersOpen}');
    expect(source).toContain('filterPanel={<GeospatialFiltersPanel />}');

    // GeospatialMapContent props
    expect(source).toContain('<GeospatialMapContent');
    expect(source).toContain('state={state}');
    expect(source).toContain('selectedNetworks={selectedNetworks}');
    expect(source).toContain('showNetworkSummaries={showNetworkSummaries}');
    expect(source).toContain('showMediaLocations={showMediaLocations}');
    expect(source).toContain('onToggleMediaLocations={setShowMediaLocations}');

    // GeospatialTableContent props
    expect(source).toContain('<GeospatialTableContent');
    expect(source).toContain('networks={networks}');
    expect(source).toContain('loadingNetworks={loadingNetworks}');
    expect(source).toContain('selectedNetworks={selectedNetworks}');

    // GeospatialOverlayContent props
    expect(source).toContain('<GeospatialOverlayContent');
    expect(source).toContain('contextMenu={contextMenu}');
    expect(source).toContain('timeFreqModal={timeFreqModal}');
    expect(source).toContain('showNoteModal={showNoteModal}');

    // MapRadiusContextMenu props
    expect(source).toContain('<MapRadiusContextMenu');
    expect(source).toContain('menu={state.radiusContextMenu}');
  });

  test('keeps the current overlay orchestration boundary in the page component', () => {
    expect(source).toContain('useNearestAgencies(');
    expect(source).toContain('useNearestCourthouses(');
    expect(source).toContain('useNetworkNotes({ logError })');
    expect(source).toContain('useTimeFrequencyModal()');
    expect(source).toContain('useAgencyLayer({');
    expect(source).toContain('useFederalCourthouses(');
    expect(source).toContain('<GeospatialOverlayContent');
    expect(source).toContain('<MapRadiusContextMenu');
  });

  test('initializes UI and layout local states', () => {
    expect(source).toContain(
      "const [locationMode, setLocationMode] = useState('latest_observation')"
    );
    expect(source).toContain(
      'const [showNetworkSummaries, setShowNetworkSummaries] = useState(false)'
    );
    expect(source).toContain('const [showMediaLocations, setShowMediaLocations] = useState(false)');
  });
});
