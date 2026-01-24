import React from 'react';

interface GeospatialContentProps {
  filtersOpen: boolean;
  children: React.ReactNode;
}

export const GeospatialContent = ({ filtersOpen, children }: GeospatialContentProps) => {
  return (
    <div className="flex h-screen">
      <div
        className="flex flex-col gap-2 h-screen flex-1"
        style={{ marginLeft: filtersOpen ? '352px' : 0, padding: '8px' }}
      >
        {children}
      </div>
    </div>
  );
};
