import React, { useEffect, useRef, useState } from 'react';
import vendorManifest from './vendor_intel_manifest.json';

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = 'leaked' | 'foia' | 'manufacturer' | 'public' | 'research';

interface VendorDoc {
  title: string;
  source_type: SourceType;
  format: 'html' | 'pdf';
  file: string;
  summary: string;
  year: number;
  origin: string;
}

interface VendorEntry {
  vendor_key: string;
  display_name: string;
  oui_prefixes: string[];
  threat_tier: 1 | 2 | 3;
  surveillance_type: string;
  description: string;
  docs: VendorDoc[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'TIER 1 — ACTIVE INTERCEPT', color: '#dc2626', bg: '#dc262615', border: '#dc262640' },
  2: {
    label: 'TIER 2 — PASSIVE SURVEILLANCE',
    color: '#f97316',
    bg: '#f9731615',
    border: '#f9731640',
  },
  3: {
    label: 'TIER 3 — DUAL-USE / TACTICAL',
    color: '#eab308',
    bg: '#eab30815',
    border: '#eab30840',
  },
};

const SOURCE_BADGES: Record<
  SourceType,
  { label: string; color: string; bg: string; border: string }
> = {
  leaked: { label: 'LEAKED', color: '#dc2626', bg: '#dc262620', border: '#dc262660' },
  foia: { label: 'FOIA', color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b50' },
  manufacturer: { label: 'MANUFACTURER', color: '#6b7280', bg: '#6b728015', border: '#6b728040' },
  public: { label: 'PUBLIC', color: '#3b82f6', bg: '#3b82f615', border: '#3b82f640' },
  research: { label: 'RESEARCH', color: '#8b5cf6', bg: '#8b5cf615', border: '#8b5cf640' },
};

const VENDOR_DOCS_BASE = '/vendor-docs/';

// ─── Event bus ────────────────────────────────────────────────────────────────

export const VENDOR_INTEL_EVENT = 'vendor-intel-open';

export function emitVendorIntel(surveillanceType: string): void {
  window.dispatchEvent(new CustomEvent(VENDOR_INTEL_EVENT, { detail: { surveillanceType } }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SourceBadge: React.FC<{ type: SourceType }> = ({ type }) => {
  const b = SOURCE_BADGES[type] ?? SOURCE_BADGES.public;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 6px',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: b.color,
        background: b.bg,
        border: `1px solid ${b.border}`,
        flexShrink: 0,
      }}
    >
      {b.label}
    </span>
  );
};

const DocCard: React.FC<{ doc: VendorDoc }> = ({ doc }) => {
  const href = `${VENDOR_DOCS_BASE}${doc.file}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '6px',
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')
      }
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px' }}>
        <SourceBadge type={doc.source_type} />
        <span
          style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.3, flex: 1 }}
        >
          {doc.title}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
        {doc.summary}
      </p>
      <div style={{ marginTop: '5px', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)' }}>{doc.origin}</span>
        {doc.year && (
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>{doc.year}</span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '9px',
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {doc.format === 'pdf' ? '📄 PDF' : '🌐 HTML'}
        </span>
      </div>
    </a>
  );
};

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export const VendorIntelDrawer: React.FC = () => {
  const [vendor, setVendor] = useState<VendorEntry | null>(null);
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const { surveillanceType } = (e as CustomEvent).detail as { surveillanceType: string };
      const found = (vendorManifest.vendors as VendorEntry[]).find(
        (v) => v.surveillance_type === surveillanceType
      );
      if (found) {
        setVendor(found);
        setOpen(true);
      }
    };
    window.addEventListener(VENDOR_INTEL_EVENT, handler);
    return () => window.removeEventListener(VENDOR_INTEL_EVENT, handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!vendor) return null;

  const tier = TIER_COLORS[vendor.threat_tier] ?? TIER_COLORS[3];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 9998,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s',
        }}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-label={`Vendor Intel: ${vendor.display_name}`}
        aria-modal="true"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(420px, 95vw)',
          background: '#0f1117',
          borderLeft: `2px solid ${tier.color}40`,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.6)',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: tier.bg,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: tier.color,
                  background: tier.bg,
                  border: `1px solid ${tier.border}`,
                  marginBottom: '6px',
                }}
              >
                {tier.label}
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#fff',
                  lineHeight: 1.2,
                }}
              >
                {vendor.display_name}
              </h2>
              <div
                style={{
                  marginTop: '4px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: tier.color,
                  letterSpacing: '0.05em',
                }}
              >
                {vendor.surveillance_type}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close vendor intel drawer"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '6px',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: '6px 8px',
                fontSize: '14px',
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          {/* Description */}
          <p
            style={{
              margin: '10px 0 0',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.6,
            }}
          >
            {vendor.description}
          </p>

          {/* OUI chips */}
          {vendor.oui_prefixes.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              <span
                style={{
                  fontSize: '9px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'rgba(255,255,255,0.3)',
                  alignSelf: 'center',
                  marginRight: '2px',
                }}
              >
                OUI:
              </span>
              {vendor.oui_prefixes.map((oui) => (
                <span
                  key={oui}
                  style={{
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontFamily: 'monospace',
                    color: 'rgba(255,255,255,0.7)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {oui}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Doc list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px 24px',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.3)',
              marginBottom: '10px',
            }}
          >
            Reference Documents ({vendor.docs.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {vendor.docs.map((doc, i) => (
              <DocCard key={i} doc={doc} />
            ))}
          </div>
          {vendor.docs.length === 0 && (
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
              No reference documents indexed for this vendor.
            </p>
          )}
        </div>
      </div>
    </>
  );
};
