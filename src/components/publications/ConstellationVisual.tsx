'use client';

import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Publication, ResearchArea } from '@/types/publication';

const AREA_COLORS: Record<ResearchArea | 'other', string> = {
  'ai-healthcare': '#10b981',
  'signal-processing': '#f59e0b',
  'reliability-engineering': '#ef4444',
  'quantum-computing': '#a855f7',
  'machine-learning': '#3b82f6',
  'fault-diagnosis': '#f97316',
  'neural-networks': '#8b5cf6',
  'transformer-architectures': '#6366f1',
  'biomedical-engineering': '#14b8a6',
  other: '#94a3b8',
};

const AREA_LABELS: Record<string, string> = {
  'ai-healthcare': 'AI Healthcare',
  'signal-processing': 'Signal Processing',
  'reliability-engineering': 'Reliability',
  'quantum-computing': 'Quantum',
  'machine-learning': 'ML',
  'fault-diagnosis': 'Fault Diagnosis',
  'neural-networks': 'Neural Nets',
  'transformer-architectures': 'Transformers',
  'biomedical-engineering': 'Biomedical',
  other: 'Other',
};

interface StarNode {
  id: string;
  cx: number;
  cy: number;
  r: number;
  color: string;
  area: string;
  pub: Publication;
}

interface ConnEdge {
  from: string;
  to: string;
  strength: number;
}

function buildGraph(pubs: Publication[]): { nodes: StarNode[]; edges: ConnEdge[] } {
  const nodes: StarNode[] = [];
  const edges: ConnEdge[] = [];

  // Simple hash for seeding deterministic positions
  const hash = (s: string, seed: number) => {
    let h = seed;
    for (let i = 0; i < s.length; i++) h = ((h * 31) ^ s.charCodeAt(i)) >>> 0;
    return (h % 10000) / 10000;
  };

  // Group by research area
  const areaMap = new Map<string, Publication[]>();
  for (const p of pubs) {
    const area = p.researchArea || 'other';
    if (!areaMap.has(area)) areaMap.set(area, []);
    areaMap.get(area)!.push(p);
  }

  const areas = Array.from(areaMap.keys());
  const areaCount = areas.length;

  // Position cluster centers on a circle
  areas.forEach((area, areaIdx) => {
    const baseAngle = (areaIdx / Math.max(areaCount, 1)) * 2 * Math.PI - Math.PI / 2;
    const dist = areaCount <= 1 ? 0.15 : 0.32;
    const cx = 50 + dist * 100 * Math.cos(baseAngle);
    const cy = 50 + dist * 100 * Math.sin(baseAngle);

    const areaPubs = areaMap.get(area)!;
    const spread = areaPubs.length <= 1 ? 0 : 12;

    areaPubs.forEach((pub) => {
      const a = hash(pub.id, 0) * 2 * Math.PI;
      const d = areaPubs.length <= 1 ? 0 : hash(pub.id, 1) * spread;
      nodes.push({
        id: pub.id,
        cx: cx + d * Math.cos(a),
        cy: cy + d * Math.sin(a),
        r: pub.featured ? 4 : 2.5,
        color: AREA_COLORS[area as ResearchArea] || AREA_COLORS.other,
        area,
        pub,
      });
    });
  });

  // Build edges based on shared keywords and research area
  for (let i = 0; i < pubs.length; i++) {
    for (let j = i + 1; j < pubs.length; j++) {
      let strength = 0;
      if (pubs[i].researchArea === pubs[j].researchArea) strength += 2;
      const shared = (pubs[i].keywords || []).filter((k) =>
        (pubs[j].keywords || []).includes(k)
      ).length;
      strength += shared;
      const coAuthors = pubs[i].authors.filter((a) =>
        pubs[j].authors.some((b) => b.name === a.name)
      ).length;
      strength += coAuthors;

      if (strength > 0) {
        edges.push({ from: pubs[i].id, to: pubs[j].id, strength: Math.min(strength, 4) });
      }
    }
  }

  return { nodes, edges };
}

export default function ConstellationVisual({
  publications,
  onSelectPub,
}: {
  publications: Publication[];
  onSelectPub?: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const { nodes, edges, connectedIds } = useMemo(() => {
    const graph = buildGraph(publications);
    const connected = new Set<string>();
    if (hoveredId) {
      for (const edge of graph.edges) {
        if (edge.from === hoveredId) connected.add(edge.to);
        if (edge.to === hoveredId) connected.add(edge.from);
      }
    }
    return { ...graph, connectedIds: connected };
  }, [publications, hoveredId]);

  // Background stars — deterministic seeds
  const bgStars = useMemo(() => {
    const stars: { cx: number; cy: number; r: number; opacity: number; delay: number }[] = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        cx: ((i * 137 + 53) % 997) / 10, // ~0-99
        cy: ((i * 251 + 97) % 1007) / 10,
        r: ((i * 67) % 3) === 0 ? 1.2 : 0.6,
        opacity: 0.25 + ((i * 73) % 40) / 100,
        delay: ((i * 173) % 4000) / 1000,
      });
    }
    return stars;
  }, []);

  const areas = useMemo(
    () => Array.from(new Set(publications.map((p) => p.researchArea || 'other'))),
    [publications]
  );

  const handleStarClick = useCallback(
    (pub: Publication) => {
      onSelectPub?.(pub.id);
      // Scroll to the publication in the list
      const el = document.getElementById(`pub-${pub.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [onSelectPub]
  );

  if (publications.length === 0) return null;

  return (
    <div className="constellation-container relative w-full rounded-xl overflow-hidden mb-10 border border-neutral-200/30 dark:border-neutral-700/30 shadow-inner"
      style={{ height: '48vh', minHeight: '320px' }}>
      {/* Dark space background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#0d1120] to-[#0f172a]" />

      <svg viewBox="0 0 100 100" className="relative w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Background stars with twinkle */}
        {bgStars.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="white"
            opacity={s.opacity}
            className="constellation-bg-star"
            style={{ animationDelay: `${s.delay}s` }}
          />
        ))}

        {/* Constellation lines */}
        {edges.map((edge) => {
          const from = nodes.find((n) => n.id === edge.from);
          const to = nodes.find((n) => n.id === edge.to);
          if (!from || !to) return null;
          const isActive =
            hoveredId === edge.from || hoveredId === edge.to;
          const base = 0.06 * edge.strength;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.cx}
              y1={from.cy}
              x2={to.cx}
              y2={to.cy}
              stroke={isActive ? '#93bbfd' : '#475569'}
              strokeWidth={isActive ? 0.25 : 0.1}
              opacity={isActive ? 0.7 : base}
              className="transition-all duration-500"
            />
          );
        })}

        {/* Publication stars */}
        {nodes.map((node) => {
          const isHovered = hoveredId === node.id;
          const isConnected = connectedIds.has(node.id);
          const isDimmed = hoveredId && !isHovered && !isConnected;
          const areaMatch = selectedArea && node.area !== selectedArea;

          return (
            <g
              key={node.id}
              onMouseEnter={() => setHoveredId(node.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleStarClick(node.pub)}
              className="cursor-pointer"
              opacity={isDimmed ? 0.3 : areaMatch ? 0.2 : 1}
            >
              {/* Glow ring */}
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.r * 2.5}
                fill={node.color}
                opacity={isHovered || isConnected ? 0.3 : 0.1}
                className="transition-all duration-500"
              />
              {/* Core star */}
              <circle
                cx={node.cx}
                cy={node.cy}
                r={isHovered ? node.r * 1.8 : node.r}
                fill={node.color}
                className="transition-all duration-300"
                filter={isHovered ? 'url(#star-glow)' : undefined}
              />
            </g>
          );
        })}

        {/* Glow filter */}
        <defs>
          <filter id="star-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredId && (() => {
          const node = nodes.find((n) => n.id === hoveredId);
          if (!node) return null;
          // Convert SVG coordinates to percentage positioning
          return (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-neutral-200/60 dark:border-neutral-700/60 pointer-events-none z-10 max-w-[300px] text-center"
            >
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2">
                {node.pub.title}
              </p>
              <div className="flex items-center justify-center gap-2 mt-1.5">
                <span className="text-xs text-neutral-500">{node.pub.journal || node.pub.conference}</span>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <span className="text-xs text-neutral-500">{node.pub.year}</span>
              </div>
              <span
                className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${node.color}20`,
                  color: node.color,
                }}
              >
                {AREA_LABELS[node.area] || node.area}
              </span>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Research area legend */}
      {areas.length > 1 && (
        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => setSelectedArea(selectedArea === area ? null : area)}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium transition-all"
              style={{
                backgroundColor: selectedArea === area
                  ? `${AREA_COLORS[area as ResearchArea] || AREA_COLORS.other}30`
                  : 'rgba(255,255,255,0.06)',
                color: AREA_COLORS[area as ResearchArea] || AREA_COLORS.other,
                border: `1px solid ${selectedArea === area ? AREA_COLORS[area as ResearchArea] || AREA_COLORS.other : 'transparent'}`,
              }}
            >
              {AREA_LABELS[area] || area}
            </button>
          ))}
        </div>
      )}

      {/* Subtle vignette overlay on edges */}
      <div className="absolute inset-0 pointer-events-none rounded-xl"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.5) 100%)',
        }}
      />
    </div>
  );
}
