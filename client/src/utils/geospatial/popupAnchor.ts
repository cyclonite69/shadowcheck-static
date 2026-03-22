import type { LngLatLike, Map } from 'mapbox-gl';

type PopupAnchor = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

function measurePopupSize(container: HTMLElement, html: string): { width: number; height: number } {
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.left = '0';
  probe.style.top = '0';
  probe.style.zIndex = '-1';
  probe.innerHTML = html;
  container.appendChild(probe);

  const measured = (probe.firstElementChild as HTMLElement | null) ?? probe;
  const rect = measured.getBoundingClientRect();
  container.removeChild(probe);

  return {
    width: rect.width || 288,
    height: rect.height || 220,
  };
}

export function getPopupAnchor(map: Map, lngLat: LngLatLike, html: string): PopupAnchor {
  const container = map.getContainer();
  const { width: tooltipWidth, height: tooltipHeight } = measurePopupSize(container, html);
  const point = map.project(lngLat);
  const bounds = container.getBoundingClientRect();
  const gap = 15;

  const overflowRight = point.x + gap + tooltipWidth > bounds.width;
  const overflowBottom = point.y + gap + tooltipHeight > bounds.height;

  if (overflowRight && overflowBottom) return 'bottom-right';
  if (overflowRight) return 'top-right';
  if (overflowBottom) return 'bottom-left';
  return 'top-left';
}
