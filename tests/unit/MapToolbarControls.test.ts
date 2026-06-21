import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OverlayToggles } from '../../client/src/components/geospatial/toolbar/MapToolbarControls';
import type { MediaLocationStatus } from '../../client/src/components/geospatial/hooks/useMediaLocationLayers';

const MEDIA_TITLE = 'Show media locations';

interface OverlayContainerProps {
  children?: React.ReactNode;
}

interface MediaButtonProps {
  title?: string;
  onClick: () => void;
  style: React.CSSProperties;
}

const renderOverlayToggles = (
  showMediaLocations: boolean,
  onToggleMediaLocations: (value: boolean) => void,
  mediaLocationStatus: MediaLocationStatus = 'idle'
) =>
  OverlayToggles({
    showNetworkSummaries: false,
    showMediaLocations,
    onToggleMediaLocations,
    mediaLocationStatus,
  }) as React.ReactElement<OverlayContainerProps>;

const findMediaButton = (node: React.ReactNode): React.ReactElement<MediaButtonProps> => {
  if (React.isValidElement<MediaButtonProps>(node) && node.props.title === MEDIA_TITLE) {
    return node;
  }

  if (React.isValidElement<OverlayContainerProps>(node)) {
    for (const child of React.Children.toArray(node.props.children)) {
      try {
        return findMediaButton(child);
      } catch {
        // Continue through sibling elements until the media control is found.
      }
    }
  }

  throw new Error('Media toggle button not found');
};

describe('MapToolbarControls media toggle characterization', () => {
  test('renders the Media label and concise tooltip', () => {
    const tree = renderOverlayToggles(false, jest.fn());
    const markup = renderToStaticMarkup(tree);
    const mediaButton = findMediaButton(tree);

    expect(markup).toContain('Media');
    expect(markup).not.toContain('Photos');
    expect(mediaButton.props.title).toBe(MEDIA_TITLE);
  });

  test.each([
    ['loading', 'Loading media locations…'],
    ['active', 'Unmatched media with GPS'],
    ['empty', 'No unmatched media with GPS found'],
    ['error', 'Failed to load media locations'],
  ] as const)('renders the %s media status while active', (status, expectedText) => {
    const markup = renderToStaticMarkup(renderOverlayToggles(true, jest.fn(), status));

    expect(markup).toContain(expectedText);
    expect(markup).toContain('role="status"');
  });

  test('hides media status text while the layer is inactive', () => {
    const markup = renderToStaticMarkup(renderOverlayToggles(false, jest.fn(), 'error'));

    expect(markup).not.toContain('Failed to load media locations');
  });

  test.each([
    { current: false, expected: true },
    { current: true, expected: false },
  ])('toggles from $current to $expected', ({ current, expected }) => {
    const onToggleMediaLocations = jest.fn();
    const mediaButton = findMediaButton(renderOverlayToggles(current, onToggleMediaLocations));

    mediaButton.props.onClick();

    expect(onToggleMediaLocations).toHaveBeenCalledWith(expected);
  });

  test('represents inactive and active media states with the current colors', () => {
    const inactiveButton = findMediaButton(renderOverlayToggles(false, jest.fn()));
    const activeButton = findMediaButton(renderOverlayToggles(true, jest.fn()));

    expect(inactiveButton.props.style).toEqual(
      expect.objectContaining({
        background: 'transparent',
        color: 'var(--nav-text-inactive)',
      })
    );
    expect(activeButton.props.style).toEqual(
      expect.objectContaining({
        background: 'rgba(236,72,153,0.12)',
        color: '#ec4899',
      })
    );
  });
});
