import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NetworkRow } from '../../client/src/types/network';
import type { ColumnBadgeConfig } from '../../client/src/types/badgeConfig';
import type { VirtualItem } from '@tanstack/react-virtual';

const mockRenderNetworkTableCell = jest.fn();

jest.mock('../../client/src/components/geospatial/networkTable/cellRenderers', () => ({
  renderNetworkTableCell: (context: any, badgeConfigs: any) =>
    mockRenderNetworkTableCell(context, badgeConfigs),
}));

jest.mock(
  '../networkTable/cellRenderers',
  () => ({
    renderNetworkTableCell: (context: any, badgeConfigs: any) =>
      mockRenderNetworkTableCell(context, badgeConfigs),
  }),
  { virtual: true }
);

// Import the component under test
import { NetworkTableRow } from '../../client/src/components/geospatial/table/NetworkTableRow';

describe('NetworkTableRow wiring', () => {
  beforeEach(() => {
    mockRenderNetworkTableCell.mockReset();
    mockRenderNetworkTableCell.mockReturnValue({
      content: React.createElement('span', null, 'Mocked Content'),
      style: {},
      title: '',
    });
  });

  it('passes badgeConfigs down into renderNetworkTableCell when rendering table cells', () => {
    const mockRow: NetworkRow = {
      bssid: 'AA:BB:CC:DD:EE:FF',
      ssid: 'TestNet',
      type: 'W',
      threat_score: 95,
    } as NetworkRow;

    const mockBadgeConfigs: Record<string, ColumnBadgeConfig> = {
      threat_score: {
        column: 'threat_score',
        enabled: true,
        shape: 'pill',
        fill: 'solid',
        size: 'normal',
        defaultColor: { accentColor: '#ef4444' },
        rules: [],
      },
    };

    const props = {
      net: mockRow,
      virtualRow: { index: 0, start: 0, size: 40 } as VirtualItem,
      visibleColumns: ['bssid', 'ssid', 'threat_score'] as Array<keyof NetworkRow | 'select'>,
      totalGridWidth: 1000,
      gridTemplateColumns: '1fr 1fr 1fr',
      selectedNetworks: new Set<string>(),
      linkedSiblingBssids: new Set<string>(),
      siblingGroupId: null,
      siblingGroupColor: null,
      isSiblingGroupStart: false,
      isSiblingGroupEnd: false,
      selectedAnchorBssid: null,
      selectedAnchorHasLinkedSiblings: false,
      onSelectExclusive: jest.fn(),
      onOpenContextMenu: jest.fn(),
      onToggleSelectNetwork: jest.fn(),
      lockedVisibleColumns: [],
      lastLockedVisibleColumn: null,
      getLockedLeft: jest.fn().mockReturnValue(0),
      getLockedZIndex: jest.fn().mockReturnValue(1),
      isPatternParent: false,
      isPatternSibling: false,
      patternGroupId: null,
      patternSiblingCount: 0,
      isPatternGroupCollapsed: false,
      onTogglePatternGroup: jest.fn(),
      badgeConfigs: mockBadgeConfigs,
    };

    renderToStaticMarkup(React.createElement(NetworkTableRow, props));

    // Verify renderNetworkTableCell was called and passed the badgeConfigs
    expect(mockRenderNetworkTableCell).toHaveBeenCalled();
    const calls = mockRenderNetworkTableCell.mock.calls;

    // Check that at least one call passed the badgeConfigs as the second argument
    let foundConfigs = false;
    for (const call of calls) {
      if (call[1] === mockBadgeConfigs) {
        foundConfigs = true;
        break;
      }
    }
    expect(foundConfigs).toBe(true);
  });
});
