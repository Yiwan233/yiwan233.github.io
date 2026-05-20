'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GalleryLocationGroup } from '@/types/page';

function createClusterIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: 'gallery-marker-cluster',
    html: `<div class="gallery-marker-inner">${count}</div>`,
    iconSize: L.point(36, 36),
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

function TileLayerSwitcher() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
      url={
        isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      }
      subdomains="abcd"
      maxZoom={19}
    />
  );
}

function toGroupId(name: string): string {
  return `gallery-group-${name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9一-鿿-]/g, '')}`;
}

export default function MapSection({ groups }: { groups: GalleryLocationGroup[] }) {
  const located = groups.filter((g) => g.lat !== 0 && g.lng !== 0);

  if (located.length === 0) return null;

  const centerLat = located.reduce((s, g) => s + g.lat, 0) / located.length;
  const centerLng = located.reduce((s, g) => s + g.lng, 0) / located.length;

  const handleScrollToGroup = (name: string) => {
    const el = document.getElementById(toGroupId(name));
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className="w-full rounded-xl overflow-hidden shadow-md border border-neutral-200 dark:border-neutral-800 mb-10"
      style={{ height: '55vh', minHeight: '300px' }}
    >
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={4}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayerSwitcher />
        {located.map((group) => (
          <Marker
            key={group.locationName || `${group.lat},${group.lng}`}
            position={[group.lat, group.lng]}
            icon={createClusterIcon(group.items.length)}
          >
            <Popup>
              <div className="text-center min-w-[160px]">
                <h4 className="font-semibold text-sm mb-1 text-neutral-900">
                  {group.locationName || '未知地点'}
                </h4>
                <p className="text-xs text-neutral-500 mb-2">{group.items.length} 张照片</p>
                {group.items[0]?.image && (
                  <img
                    src={group.items[0].image}
                    alt={group.items[0].title}
                    className="w-full h-20 object-cover rounded mb-2"
                  />
                )}
                <button
                  onClick={() => handleScrollToGroup(group.locationName)}
                  className="text-xs text-accent hover:text-accent-light font-medium transition-colors"
                >
                  查看照片
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
