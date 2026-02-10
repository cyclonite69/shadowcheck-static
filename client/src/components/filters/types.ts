/**
 * Shared types for filter sections
 */

export interface FilterSectionProps {
  filters: Record<string, any>;
  enabled: Record<string, boolean>;
  isCompact: boolean;
  controlClass: string;
  listLayoutClass: string;
  listItemTextClass: string;
  onSetFilter: (key: string, value: any) => void;
  onToggleFilter: (key: string) => void;
  onEnableFilter: (key: string) => void;
}
