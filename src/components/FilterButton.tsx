import React from 'react';

interface FilterButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export const FilterButton: React.FC<FilterButtonProps> = ({ isOpen, onClick }) => {
  return (
    <button
      type="button"
      aria-label={isOpen ? 'Hide filters' : 'Show filters'}
      title={isOpen ? 'Hide filters' : 'Show filters'}
      onClick={onClick}
      className={`fixed top-4 left-4 p-3 rounded-lg shadow-xl transition-all duration-200 z-50 pointer-events-auto ${
        isOpen
          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white scale-105'
          : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white opacity-100 hover:scale-110'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    </button>
  );
};
