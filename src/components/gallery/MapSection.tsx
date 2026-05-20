'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GalleryLocationGroup } from '@/types/page';
import { getCountry } from '@/lib/gallery';

function createMarkerIcon(count: number): L.DivIcon {
  return L.divIcon({
    className: 'gallery-marker',
    html: `<div class="gallery-marker-ring"></div><div class="gallery-marker-dot"><span>${count}</span></div>`,
    iconSize: L.point(44, 44),
    iconAnchor: [22, 22],
    popupAnchor: [0, -26],
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

function MapBoundsUpdater({ groups, activeCountry }: { groups: GalleryLocationGroup[]; activeCountry: string | null }) {
  const map = useMap();
  const prevCountry = useRef<string | null>(undefined);

  useEffect(() => {
    if (prevCountry.current === activeCountry) return;
    prevCountry.current = activeCountry;

    const target = activeCountry
      ? groups.filter((g) => getCountry(g.locationName) === activeCountry && g.lat !== 0)
      : groups.filter((g) => g.lat !== 0);

    if (target.length === 0) return;

    if (target.length === 1) {
      map.flyTo([target[0].lat, target[0].lng], target[0].lat === 0 ? 4 : 10, { duration: 1 });
    } else {
      const bounds = L.latLngBounds(
        target.map((g) => L.latLng(g.lat, g.lng))
      ).pad(0.2);
      map.flyToBounds(bounds, { duration: 1, maxZoom: 12 });
    }
  }, [activeCountry, groups, map]);

  return null;
}

export default function MapSection({
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

  const visible = activeCountry
    ? located.filter((g) => getCountry(g.locationName) === activeCountry)
    : located;

  const centerLat = visible.reduce((s, g) => s + g.lat, 0) / visible.length;
  const centerLng = visible.reduce((s, g) => s + g.lng, 0) / visible.length;

  return (
    <div className="gallery-map-container mb-10">
      <div className="gallery-map-frame">
        <div
          className="gallery-map"
          style={{ height: '55vh', minHeight: '300px' }}
        >
          <MapContainer
            center={[centerLat, centerLng]}
            zoom={4}
            scrollWheelZoom={true}
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayerSwitcher />
            <MapBoundsUpdater groups={groups} activeCountry={activeCountry} />
            {visible.map((group) => (
              <Marker
                key={group.locationName || `${group.lat},${group.lng}`}
                position={[group.lat, group.lng]}
                icon={createMarkerIcon(group.items.length)}
              >
                <Popup className="gallery-popup">
                  <div className="text-center">
                    {group.items[0]?.image && (
                      <img
                        src={group.items[0].image}
                        alt={group.items[0].title}
                        className="w-full h-24 object-cover rounded-lg mb-3"
                      />
                    )}
                    <h4 className="font-semibold text-sm mb-0.5 text-neutral-900">
                      {group.locationName || '未知地点'}
                    </h4>
                    <p className="text-xs text-neutral-500 mb-2">{group.items.length} 张照片</p>
                    <button
                      onClick={() => onScrollToGroup(group.locationName)}
                      className="text-xs font-medium px-3 py-1 rounded-full bg-accent text-white hover:bg-accent-dark transition-colors"
                    >
                      查看照片
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          {/* Vignette overlay */}
          <div className="gallery-map-vignette" />
        </div>
      </div>
    </div>
  );
}
