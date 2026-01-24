import React from 'react';

interface FiltersSidebarProps {
  open: boolean;
  children: React.ReactNode;
}

export const FiltersSidebar = ({ open, children }: FiltersSidebarProps) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '52px',
        left: '12px',
        bottom: '12px',
        width: '320px',
        zIndex: 55,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div
        style={{
          padding: '10px',
          borderRadius: '10px',
          border: '1px solid rgba(71, 85, 105, 0.4)',
          background: 'rgba(15, 23, 42, 0.9)',
          color: '#e2e8f0',
          fontSize: '12px',
        }}
      >
        {children}
      </div>
    </div>
  );
};
