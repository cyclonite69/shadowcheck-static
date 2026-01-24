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
        top: '16px',
        left: '16px',
        width: '320px',
        maxHeight: 'calc(100vh - 100px)',
        zIndex: 40,
        overflowY: 'auto',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid rgba(59, 130, 246, 0.25)',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: '#e2e8f0',
        fontSize: '12px',
      }}
    >
      {children}
    </div>
  );
};
