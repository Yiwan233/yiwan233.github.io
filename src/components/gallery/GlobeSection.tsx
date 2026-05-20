'use client';

import { useState, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { GalleryLocationGroup } from '@/types/page';
import { getCountry } from '@/lib/gallery';

const EARTH_RADIUS = 2;
const ATMOSPHERE_RADIUS = 2.1;

function latLngToVec3(lat: number, lng: number, radius = EARTH_RADIUS): THREE.Vector3 {
  const phi = lat * (Math.PI / 180);
  const theta = lng * (Math.PI / 180);
  return new THREE.Vector3(
    radius * Math.cos(phi) * Math.cos(theta),
    radius * Math.sin(phi),
    radius * Math.cos(phi) * Math.sin(theta)
  );
}

function Earth() {
  const texture = useLoader(
    THREE.TextureLoader,
    'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
  );
  return (
    <Sphere args={[EARTH_RADIUS, 64, 64]}>
      <meshStandardMaterial map={texture} roughness={0.85} metalness={0.05} />
    </Sphere>
  );
}

function Atmosphere() {
  return (
    <Sphere args={[ATMOSPHERE_RADIUS, 64, 64]}>
      <meshBasicMaterial
        color="#93bbfd"
        transparent
        opacity={0.06}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </Sphere>
  );
}

function Markers({
  visible,
  onScrollToGroup,
}: {
  visible: GalleryLocationGroup[];
  onScrollToGroup: (name: string) => void;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  return (
    <>
      {visible.map((group) => {
        const surfPos = latLngToVec3(group.lat, group.lng);
        const normal = surfPos.clone().normalize();
        const dotPos = surfPos.clone().add(normal.clone().multiplyScalar(0.06));
        const popupPos = surfPos.clone().add(normal.clone().multiplyScalar(0.6));
        const key = group.locationName || `${group.lat},${group.lng}`;
        const isSelected = selectedKey === key;

        return (
          <group key={key}>
            {/* Emissive dot above surface */}
            <mesh
              position={dotPos}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedKey(isSelected ? null : key);
              }}
            >
              <sphereGeometry args={[0.05, 16, 16]} />
              <meshStandardMaterial
                color="#2563eb"
                emissive="#60a5fa"
                emissiveIntensity={isSelected ? 3 : 1.5}
                roughness={0.2}
              />
            </mesh>

            {isSelected && (
              <Html position={popupPos} center distanceFactor={8} style={{ pointerEvents: 'auto' }}>
                <div className="globe-popup bg-white dark:bg-neutral-900 rounded-xl shadow-2xl p-3 text-center border border-neutral-200 dark:border-neutral-700 min-w-[170px]">
                  {group.items[0]?.image && (
                    <img
                      src={group.items[0].image}
                      alt={group.items[0].title}
                      className="w-full h-20 object-cover rounded-lg mb-2"
                    />
                  )}
                  <h4 className="font-semibold text-xs mb-1 text-neutral-900 dark:text-neutral-100">
                    {group.locationName || '未知地点'}
                  </h4>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    {group.items.length} 张照片
                  </p>
                  <button
                    onClick={() => {
                      onScrollToGroup(group.locationName);
                      setSelectedKey(null);
                    }}
                    className="text-[11px] font-medium px-3 py-1 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors"
                  >
                    查看照片
                  </button>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}

function Scene({
  groups,
  activeCountry,
  onScrollToGroup,
}: {
  groups: GalleryLocationGroup[];
  activeCountry: string | null;
  onScrollToGroup: (name: string) => void;
}) {
  const located = groups.filter((g) => g.lat !== 0 && g.lng !== 0);
  const visible = activeCountry
    ? located.filter((g) => getCountry(g.locationName) === activeCountry)
    : located;

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 3, 5]} intensity={0.9} />
      <Earth />
      <Atmosphere />
      <Markers visible={visible} onScrollToGroup={onScrollToGroup} />
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.35}
        minDistance={3.5}
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
  if (located.length === 0) return null;

  return (
    <div className="globe-container mb-10">
      <div className="gallery-map-frame" style={{ height: '55vh', minHeight: '320px' }}>
        <Canvas
          camera={{ position: [0, 0.3, 5.8], fov: 40 }}
          style={{
            background: 'radial-gradient(ellipse at center, #14142b 0%, #0a0a16 100%)',
          }}
          gl={{ antialias: true }}
        >
          <Suspense fallback={null}>
            <Scene
              groups={groups}
              activeCountry={activeCountry}
              onScrollToGroup={onScrollToGroup}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}
