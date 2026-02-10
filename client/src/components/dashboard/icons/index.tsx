/**
 * Dashboard SVG Icons
 */

import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const AlertTriangle: React.FC<IconProps> = ({ size = 24, className = '', style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const Wifi: React.FC<IconProps> = ({ size = 24, className = '', style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M5.59 15.87A24 24 0 0 1 12 13c2.59 0 5.11.28 7.59.87M2.13 12.94A36 36 0 0 1 12 10c3.46 0 6.87.48 10.13 1.36M2 9.13a48 48 0 0 1 20 0" />
  </svg>
);

export const Network: React.FC<IconProps> = ({ size = 24, className = '', style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <path d="M5 22v-5M19 22v-5M12 8v-3M7 19h10" />
  </svg>
);

export const Bluetooth: React.FC<IconProps> = ({ size = 24, className = '', style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M6.5 6.5l11 11L12 23l-5.5-5.5L12 12l5.5-5.5L12 1l5.5 5.5-11 11" />
  </svg>
);

export const Radio: React.FC<IconProps> = ({ size = 24, className = '', style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="2" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49M7.76 16.24a6 6 0 0 1 0-8.49M20.07 4.93a10 10 0 0 1 0 14.14M3.93 19.07a10 10 0 0 1 0-14.14" />
  </svg>
);

export const BarChart3: React.FC<IconProps> = ({ size = 24, className = '', style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M3 3v18h18" />
    <path d="M18 17V9M13 17V5M8 17v-3" />
  </svg>
);

export const Smartphone: React.FC<IconProps> = ({ size = 24, className = '', style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

export const Tower: React.FC<IconProps> = ({ size = 24, className = '', style = {} }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    style={style}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9M7.8 13.2c-2.3-2.3-2.3-6.1 0-8.5M19.1 1.9c3.9 3.9 3.9 10.3 0 14.2M16.2 4.8c2.3 2.3 2.3 6.1 0 8.5M12 12v10M8 22h8" />
  </svg>
);

export const GripHorizontal: React.FC<Omit<IconProps, 'style'>> = ({
  size = 24,
  className = '',
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="9" r="1" />
    <circle cx="19" cy="9" r="1" />
    <circle cx="5" cy="9" r="1" />
    <circle cx="12" cy="15" r="1" />
    <circle cx="19" cy="15" r="1" />
    <circle cx="5" cy="15" r="1" />
  </svg>
);
