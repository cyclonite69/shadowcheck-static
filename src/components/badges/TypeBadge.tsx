import type { NetworkRow } from '../../types/network';
import { NETWORK_TYPE_CONFIG } from '../../constants/network';

interface TypeBadgeProps {
  type: NetworkRow['type'];
}

export const TypeBadge = ({ type }: TypeBadgeProps) => {
  const config = NETWORK_TYPE_CONFIG[type || '?'] || NETWORK_TYPE_CONFIG['?'];
  return (
    <span
      className="px-2.5 py-1.5 rounded-md text-xs font-semibold inline-block"
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
