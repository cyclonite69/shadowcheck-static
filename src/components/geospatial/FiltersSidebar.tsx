import React from 'react';

interface FiltersSidebarProps {
  open: boolean;
  children: React.ReactNode;
}

export const FiltersSidebar = ({ open, children }: FiltersSidebarProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed top-14 left-3 w-72 max-h-[calc(100vh-80px)] z-40 overflow-y-auto overflow-x-hidden rounded-xl border border-blue-500/20 bg-slate-900/95 backdrop-blur-xl shadow-2xl pointer-events-auto"
      style={{
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}
    >
      <div className="p-3 space-y-2 text-xs">{children}</div>
    </div>
  );
};
