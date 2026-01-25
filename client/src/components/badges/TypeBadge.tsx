import type { NetworkRow } from '../../types/network';
import { NETWORK_TYPE_CONFIG } from '../../constants/network';

interface TypeBadgeProps {
  type: NetworkRow['type'];
}

export const TypeBadge = ({ type }: TypeBadgeProps) => {
  const config = NETWORK_TYPE_CONFIG[type || '?'] || NETWORK_TYPE_CONFIG['?'];
  return (
    <span
      className="px-1.5 py-0.5 rounded text-xs font-medium inline-block"
      style={{
        backgroundColor: config.color + '20',
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      {config.label}
    </span>
  );
};
