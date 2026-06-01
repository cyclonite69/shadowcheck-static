import React, { useState, useMemo } from 'react';
import vendorManifest from '../../vendor-intel/vendor_intel_manifest.json';

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

const TIER_CONFIG: Record<number, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'Tier 1 — Active Intercept', color: '#dc2626', bg: '#dc262612', border: '#dc262640' },
  2: {
    label: 'Tier 2 — Passive Surveillance',
    color: '#f97316',
    bg: '#f9731612',
    border: '#f9731640',
  },
  3: {
    label: 'Tier 3 — Dual-Use / Tactical',
    color: '#eab308',
    bg: '#eab30812',
    border: '#eab30840',
  },
};

const SOURCE_CONFIG: Record<
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

const ALL_SOURCE_TYPES: SourceType[] = ['leaked', 'foia', 'manufacturer', 'public', 'research'];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SourceBadge: React.FC<{ type: SourceType }> = ({ type }) => {
  const c = SOURCE_CONFIG[type] ?? SOURCE_CONFIG.public;
  return (
    <span
      className="inline-block shrink-0"
      style={{
        padding: '1px 6px',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      {c.label}
    </span>
  );
};

const TierBadge: React.FC<{ tier: number }> = ({ tier }) => {
  const c = TIER_CONFIG[tier] ?? TIER_CONFIG[3];
  return (
    <span
      style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.border}`,
      }}
    >
      {c.label.toUpperCase()}
    </span>
  );
};

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export const SigintLibraryTab: React.FC = () => {
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceType | null>(null);
  const [search, setSearch] = useState('');
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  const vendors = vendorManifest.vendors as VendorEntry[];

  const filtered = useMemo(() => {
    return vendors
      .filter((v) => tierFilter === null || v.threat_tier === tierFilter)
      .filter((v) => {
        if (!sourceFilter) return true;
        return v.docs.some((d) => d.source_type === sourceFilter);
      })
      .filter((v) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          v.display_name.toLowerCase().includes(q) ||
          v.surveillance_type.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.docs.some(
            (d) =>
              d.title.toLowerCase().includes(q) ||
              d.summary.toLowerCase().includes(q) ||
              d.origin.toLowerCase().includes(q)
          )
        );
      })
      .sort((a, b) => a.threat_tier - b.threat_tier);
  }, [vendors, tierFilter, sourceFilter, search]);

  const totalDocs = vendors.reduce((sum, v) => sum + v.docs.length, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-white">SIGINT Vendor Library</h2>
            <p className="text-sm text-slate-400 mt-1">
              {vendors.length} vendors · {totalDocs} reference documents indexed
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tier filter */}
            <div className="flex gap-1">
              {[1, 2, 3].map((t) => {
                const c = TIER_CONFIG[t];
                return (
                  <button
                    key={t}
                    onClick={() => setTierFilter(tierFilter === t ? null : t)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '10px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      cursor: 'pointer',
                      border: `1px solid ${tierFilter === t ? c.color : 'rgba(255,255,255,0.12)'}`,
                      background: tierFilter === t ? c.bg : 'rgba(255,255,255,0.04)',
                      color: tierFilter === t ? c.color : 'rgba(255,255,255,0.5)',
                      transition: 'all 0.15s',
                    }}
                  >
                    T{t}
                  </button>
                );
              })}
            </div>

            {/* Source filter */}
            <select
              value={sourceFilter ?? ''}
              onChange={(e) => setSourceFilter((e.target.value as SourceType) || null)}
              className="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All sources</option>
              {ALL_SOURCE_TYPES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_CONFIG[s].label}
                </option>
              ))}
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="Search vendors, docs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-slate-300 text-xs rounded-md px-3 py-1.5 w-48 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Vendor cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">
            No vendors match the current filters.
          </div>
        )}
        {filtered.map((vendor) => {
          const tier = TIER_CONFIG[vendor.threat_tier] ?? TIER_CONFIG[3];
          const isExpanded = expandedVendor === vendor.vendor_key;
          const visibleDocs = sourceFilter
            ? vendor.docs.filter((d) => d.source_type === sourceFilter)
            : vendor.docs;

          return (
            <div
              key={vendor.vendor_key}
              className="rounded-xl border backdrop-blur-sm overflow-hidden"
              style={{
                borderColor: isExpanded ? `${tier.color}40` : 'rgba(255,255,255,0.08)',
                background: '#0f1117',
              }}
            >
              {/* Vendor header row */}
              <button
                onClick={() => setExpandedVendor(isExpanded ? null : vendor.vendor_key)}
                className="w-full text-left"
                style={{ padding: '14px 16px', background: isExpanded ? tier.bg : 'transparent' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <TierBadge tier={vendor.threat_tier} />
                      <span
                        style={{
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          color: 'rgba(255,255,255,0.35)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {vendor.surveillance_type}
                      </span>
                    </div>
                    <div className="text-white font-semibold text-sm">{vendor.display_name}</div>
                    <div className="text-slate-400 text-xs mt-1 line-clamp-2">
                      {vendor.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500">{vendor.docs.length} docs</span>
                    <span
                      style={{
                        color: tier.color,
                        fontSize: '16px',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        display: 'inline-block',
                      }}
                    >
                      ›
                    </span>
                  </div>
                </div>

                {/* OUI chips */}
                {vendor.oui_prefixes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-slate-500 self-center">OUI:</span>
                    {vendor.oui_prefixes.map((oui) => (
                      <span
                        key={oui}
                        className="text-xs font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.6)',
                          fontSize: '9px',
                        }}
                      >
                        {oui}
                      </span>
                    ))}
                  </div>
                )}
              </button>

              {/* Expanded doc list */}
              {isExpanded && (
                <div
                  style={{
                    borderTop: `1px solid ${tier.color}25`,
                    padding: '12px 16px 16px',
                    background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">
                    Reference Documents
                  </div>
                  <div className="space-y-2">
                    {visibleDocs.map((doc, i) => (
                      <a
                        key={i}
                        href={`${VENDOR_DOCS_BASE}${doc.file}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg p-3 transition-colors"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            'rgba(255,255,255,0.06)')
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLElement).style.background =
                            'rgba(255,255,255,0.03)')
                        }
                      >
                        <div className="flex items-start gap-2 mb-1.5">
                          <SourceBadge type={doc.source_type} />
                          <span className="text-sm font-medium text-slate-200 leading-snug flex-1">
                            {doc.title}
                          </span>
                          <span
                            className="text-xs shrink-0"
                            style={{
                              color: 'rgba(255,255,255,0.3)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {doc.format === 'pdf' ? '📄 PDF' : '🌐 HTML'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed mb-1.5">
                          {doc.summary}
                        </p>
                        <div
                          className="flex gap-3 text-xs"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          <span>{doc.origin}</span>
                          {doc.year && <span>{doc.year}</span>}
                        </div>
                      </a>
                    ))}
                    {visibleDocs.length === 0 && (
                      <p className="text-xs text-slate-500 italic">
                        No documents match the current source filter.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
