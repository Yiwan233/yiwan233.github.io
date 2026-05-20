'use client';

import { useState, useMemo, Suspense, useCallback, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GalleryLocationGroup } from '@/types/page';
import { getCountry } from '@/lib/gallery';

const EARTH_RADIUS = 2;
const ATMOSPHERE_RADIUS = 2.1;

function latLngToVec3(lat: number, lng: number, radius = EARTH_RADIUS): THREE.Vector3 {
  const phi = (lng + 180) * (Math.PI / 180);
  const theta = (90 - lat) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

interface CountryAgg {
  name: string;
  lat: number;
  lng: number;
  totalItems: number;
  groups: GalleryLocationGroup[];
}

function buildCountryAggs(groups: GalleryLocationGroup[]): CountryAgg[] {
  const map = new Map<string, CountryAgg>();
  for (const g of groups) {
    if (g.lat === 0 && g.lng === 0) continue;
    const name = getCountry(g.locationName);
    if (!name) continue;
    if (!map.has(name)) {
      map.set(name, { name, lat: 0, lng: 0, totalItems: 0, groups: [] });
    }
    const entry = map.get(name)!;
    entry.groups.push(g);
    entry.totalItems += g.items.length;
    entry.lat = entry.groups.reduce((s, c) => s + c.lat, 0) / entry.groups.length;
    entry.lng = entry.groups.reduce((s, c) => s + c.lng, 0) / entry.groups.length;
  }
  return Array.from(map.values());
}

function Earth() {
  const texture = useLoader(
    THREE.TextureLoader,
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
  );
  return (
    <Sphere args={[EARTH_RADIUS, 64, 64]}>
      <meshStandardMaterial map={texture} roughness={0.75} metalness={0.05} />
    </Sphere>
  );
}

function Atmosphere() {
  return (
    <Sphere args={[ATMOSPHERE_RADIUS, 64, 64]}>
      <meshBasicMaterial
        color="#93bbfd"
        transparent
        opacity={0.08}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </Sphere>
  );
}

/* ── Country-level marker (gold, larger) ── */
function CountryMarkers({
  countries,
  onExpand,
}: {
  countries: CountryAgg[];
  onExpand: (country: string) => void;
}) {
  return (
    <>
      {countries.map((c) => {
        const surf = latLngToVec3(c.lat, c.lng);
        const n = surf.clone().normalize();
        const dotPos = surf.clone().add(n.clone().multiplyScalar(0.06));
        const labelPos = surf.clone().add(n.clone().multiplyScalar(0.38));

        return (
          <group key={c.name}>
            <mesh
              position={dotPos}
              onClick={(e) => { e.stopPropagation(); onExpand(c.name); }}
            >
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial
                color="#f59e0b"
                emissive="#fbbf24"
                emissiveIntensity={1.8}
                roughness={0.15}
              />
            </mesh>
            <Html position={labelPos} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
              <div className="text-center whitespace-nowrap">
                <span className="text-[11px] font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  {c.name}
                </span>
                <span className="text-[10px] text-amber-200 ml-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                  ({c.totalItems})
                </span>
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

/* ── City-level marker (blue, no popup — click scrolls directly) ── */
function CityMarkers({
  groups,
  onScrollToGroup,
}: {
  groups: GalleryLocationGroup[];
  onScrollToGroup: (name: string) => void;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Sort groups to stagger label offsets and reduce overlap
  const sorted = useMemo(() => [...groups].sort((a, b) => a.lat - b.lat), [groups]);

  return (
    <>
      {sorted.map((group, idx) => {
        const surf = latLngToVec3(group.lat, group.lng);
        const n = surf.clone().normalize();
        const dotPos = surf.clone().add(n.clone().multiplyScalar(0.06));
        const labelPos = surf.clone().add(n.clone().multiplyScalar(0.22 + idx * 0.06));
        const key = group.locationName || `${group.lat},${group.lng}`;
        const isHovered = hoveredKey === key;
        const shortName = group.locationName.split(',')[0].trim();

        return (
          <group key={key}>
            {/* Hover glow ring */}
            <mesh position={dotPos} visible={isHovered}>
              <ringGeometry args={[0.06, 0.13, 32]} />
              <meshBasicMaterial color="#60a5fa" transparent opacity={0.45} side={THREE.DoubleSide} />
            </mesh>
            {/* Dot */}
            <mesh
              position={dotPos}
              onClick={(e) => {
                e.stopPropagation();
                onScrollToGroup(group.locationName);
              }}
              onPointerOver={(e) => { e.stopPropagation(); setHoveredKey(key); }}
              onPointerOut={() => setHoveredKey(null)}
            >
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial
                color="#2563eb"
                emissive="#60a5fa"
                emissiveIntensity={isHovered ? 2.8 : 1.4}
                roughness={0.2}
              />
            </mesh>
            {/* City name label */}
            <Html position={labelPos} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
              <span
                className={`text-[10px] font-medium whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] transition-all duration-200 ${
                  isHovered ? 'text-white scale-110' : 'text-white/75'
                }`}
              >
                {shortName}
              </span>
            </Html>
          </group>
        );
      })}
    </>
  );
}

/* ── Smooth camera zoom when expanding / collapsing country ── */
function CameraZoom({ target }: { target: THREE.Vector3 | null }) {
  const { camera } = useThree();
  const goalRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    goalRef.current = target;
  }, [target]);

  useFrame(() => {
    if (goalRef.current) {
      camera.position.lerp(goalRef.current, 0.04);
      camera.lookAt(0, 0, 0);
    }
  });

  return null;
}

function Scene({
  groups,
  activeCountry,
  expandedCountry,
  onExpandCountry,
  onScrollToGroup,
}: {
  groups: GalleryLocationGroup[];
  activeCountry: string | null;
  expandedCountry: string | null;
  onExpandCountry: (c: string | null) => void;
  onScrollToGroup: (name: string) => void;
}) {
  const located = groups.filter((g) => g.lat !== 0 && g.lng !== 0);
  const countries = useMemo(() => buildCountryAggs(located), [located]);

  const effectiveCountry = activeCountry || expandedCountry;
  const isZoomedIn = !!effectiveCountry;

  const visibleCities = useMemo(
    () =>
      effectiveCountry
        ? located.filter((g) => getCountry(g.locationName) === effectiveCountry)
        : [],
    [effectiveCountry, located]
  );

  // Compute camera target position
  const camTarget = useMemo(() => {
    if (!isZoomedIn || visibleCities.length === 0) return null;
    const avgLat = visibleCities.reduce((s, g) => s + g.lat, 0) / visibleCities.length;
    const avgLng = visibleCities.reduce((s, g) => s + g.lng, 0) / visibleCities.length;
    const pos = latLngToVec3(avgLat, avgLng);
    return pos.clone().normalize().multiplyScalar(3.8);
  }, [isZoomedIn, visibleCities]);

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} />
      <directionalLight position={[-3, 1, -2]} intensity={0.3} />
      <Earth />
      <Atmosphere />

      {isZoomedIn ? (
        <CityMarkers
          groups={visibleCities}
          onScrollToGroup={onScrollToGroup}
        />
      ) : (
        <CountryMarkers countries={countries} onExpand={onExpandCountry} />
      )}

      <CameraZoom target={camTarget} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        autoRotate={!isZoomedIn}
        autoRotateSpeed={0.35}
        minDistance={3}
        maxDistance={9}
        enablePan={false}
      />
    </>
  );
}

export default function GlobeSection({
  groups,
  activeCountry,
  onScrollToGroup,
}: {
  groups: GalleryLocationGroup[];
  activeCountry: string | null;
  onScrollToGroup: (name: string) => void;
}) {
  const located = groups.filter((g) => g.lat !== 0 && g.lng !== 0);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  // When filter chips change externally, sync expanded country
  const effectiveCountry = activeCountry || expandedCountry;

  const handleExpand = useCallback((c: string | null) => {
    setExpandedCountry(c);
  }, []);

  if (located.length === 0) return null;

  return (
    <div className="globe-container mb-10">
      <div className="gallery-map-frame relative" style={{ height: '55vh', minHeight: '320px' }}>
        <Canvas
          camera={{ position: [0, 0.3, 5.8], fov: 40 }}
          style={{
            background: 'radial-gradient(ellipse at center, #1a2040 0%, #0f1525 100%)',
          }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <Scene
              groups={groups}
              activeCountry={activeCountry}
              expandedCountry={expandedCountry}
              onExpandCountry={handleExpand}
              onScrollToGroup={onScrollToGroup}
            />
          </Suspense>
        </Canvas>

        {/* Back button overlay when zoomed into a country */}
        {effectiveCountry && !activeCountry && (
          <button
            onClick={() => setExpandedCountry(null)}
            className="absolute top-3 left-3 z-10 text-xs px-3 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm shadow-md border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
          >
            ← 返回全球
          </button>
        )}
      </div>
    </div>
  );
}
