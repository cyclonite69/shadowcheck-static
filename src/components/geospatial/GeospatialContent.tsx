import React from 'react';

interface GeospatialContentProps {
  filtersOpen: boolean;
  children: React.ReactNode;
}

export const GeospatialContent = ({ filtersOpen, children }: GeospatialContentProps) => {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex flex-col gap-1 h-screen flex-1 w-full">{children}</div>
    </div>
  );
};
