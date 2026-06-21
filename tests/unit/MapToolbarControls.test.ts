import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OverlayToggles } from '../../client/src/components/geospatial/toolbar/MapToolbarControls';

const MEDIA_TITLE = 'Show/hide photo precise locations from unmatched VISINT media attachments';

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
  onToggleMediaLocations: (value: boolean) => void
) =>
  OverlayToggles({
    showNetworkSummaries: false,
    showMediaLocations,
    onToggleMediaLocations,
  }) as React.ReactElement<OverlayContainerProps>;

const findMediaButton = (
  tree: React.ReactElement<OverlayContainerProps>
): React.ReactElement<MediaButtonProps> => {
  const button = React.Children.toArray(tree.props.children).find(
    (child) => React.isValidElement<MediaButtonProps>(child) && child.props.title === MEDIA_TITLE
  );

  if (!React.isValidElement<MediaButtonProps>(button)) {
    throw new Error('Media toggle button not found');
  }
  return button;
};

describe('MapToolbarControls media toggle characterization', () => {
  test('renders the current Photos label and unmatched-media tooltip', () => {
    const tree = renderOverlayToggles(false, jest.fn());
    const markup = renderToStaticMarkup(tree);
    const mediaButton = findMediaButton(tree);

    expect(markup).toContain('Photos');
    expect(mediaButton.props.title).toBe(MEDIA_TITLE);
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
