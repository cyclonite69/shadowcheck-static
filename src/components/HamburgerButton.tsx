import React from 'react';

interface HamburgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const HamburgerButton: React.FC<HamburgerButtonProps> = ({ isOpen, onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      className={`fixed top-4 left-4 z-50 p-2 rounded-lg transition-all duration-200 ${
        isOpen ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-slate-300 hover:bg-white/20'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {isOpen ? (
          <>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </>
        ) : (
          <>
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </>
        )}
      </svg>
    </button>
  );
};
