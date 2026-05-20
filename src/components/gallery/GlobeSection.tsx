'use client';

import { useMemo, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
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

function Scene({
  groups,
  onCountryClick,
}: {
  groups: GalleryLocationGroup[];
  onCountryClick: (country: string) => void;
}) {
  const located = groups.filter((g) => g.lat !== 0 && g.lng !== 0);
  const countries = useMemo(() => buildCountryAggs(located), [located]);

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} />
      <directionalLight position={[-3, 1, -2]} intensity={0.3} />
      <Earth />
      <Atmosphere />

      <CountryMarkers countries={countries} onExpand={onCountryClick} />

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        autoRotate
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
  onCountryClick,
}: {
  groups: GalleryLocationGroup[];
  onCountryClick: (country: string) => void;
}) {
  const located = groups.filter((g) => g.lat !== 0 && g.lng !== 0);

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
              onCountryClick={onCountryClick}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
