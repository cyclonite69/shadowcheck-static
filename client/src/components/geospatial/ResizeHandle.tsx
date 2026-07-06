import React from 'react';

export type ResizeSnapTarget = 'map' | 'table';

interface ResizeHandleProps {
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSnapPane: (target: ResizeSnapTarget) => void;
}

const SnapIcon = ({ direction }: { direction: 'up' | 'down' }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {direction === 'up' ? <polyline points="3,7 6,4 9,7" /> : <polyline points="3,5 6,8 9,5" />}
  </svg>
);

export const ResizeHandle = ({ onMouseDown, onSnapPane }: ResizeHandleProps) => {
  const handleSnapClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    target: ResizeSnapTarget
  ) => {
    event.preventDefault();
    event.stopPropagation();
    onSnapPane(target);
  };

  return (
    <div
      className="cursor-row-resize hover:bg-blue-500/20 transition-colors flex items-center justify-center"
      style={{
        height: '18px',
        background: 'rgba(71, 85, 105, 0.3)',
        borderRadius: '4px',
        userSelect: 'none',
        gap: '8px',
      }}
      onMouseDown={onMouseDown}
    >
      <button
        type="button"
        aria-label="Maximize table pane"
        title="Maximize table pane"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => handleSnapClick(event, 'table')}
        style={{
          width: '22px',
          height: '16px',
          border: '1px solid rgba(148, 163, 184, 0.45)',
          borderRadius: '4px',
          background: 'rgba(15, 23, 42, 0.72)',
          color: 'rgba(226, 232, 240, 0.85)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <SnapIcon direction="up" />
      </button>
      <div
        aria-hidden="true"
        style={{
          width: '24px',
          height: '2px',
          background: 'rgba(148, 163, 184, 0.6)',
          borderRadius: '1px',
        }}
      />
      <button
        type="button"
        aria-label="Maximize map pane"
        title="Maximize map pane"
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => handleSnapClick(event, 'map')}
        style={{
          width: '22px',
          height: '16px',
          border: '1px solid rgba(148, 163, 184, 0.45)',
          borderRadius: '4px',
          background: 'rgba(15, 23, 42, 0.72)',
          color: 'rgba(226, 232, 240, 0.85)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <SnapIcon direction="down" />
      </button>
    </div>
  );
};
