'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { GalleryPageConfig } from '@/types/page';
import { groupPhotosByLocation, groupPhotosByCountry, groupPhotosByCity } from '@/lib/gallery';
import CityAccordion, { toGroupId } from '@/components/gallery/CityAccordion';

const GlobeSection = dynamic(() => import('@/components/gallery/GlobeSection'), { ssr: false });
const MapSection = dynamic(() => import('@/components/gallery/MapSection'), { ssr: false });

export default function GalleryPage({ config }: { config: GalleryPageConfig }) {
  const items = config.items;
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [expandedAccordionId, setExpandedAccordionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'globe'>('map');

  const locationGroups = useMemo(() => groupPhotosByLocation(items), [items]);
  const countryGroups = useMemo(() => groupPhotosByCountry(items), [items]);
  const allCountries = [...countryGroups.keys()];

  // Build lookup: location group name → accordion ID
  const locationToAccordionId = useMemo(() => {
    const map = new Map<string, string>();
    for (const [country, countryItems] of countryGroups.entries()) {
      const cities = groupPhotosByCity(countryItems);
      for (const [city, cityItems] of cities.entries()) {
        // For each city group, find matching location groups via shared slugs
        for (const lg of locationGroups) {
          const hasMatch = lg.items.some(gi =>
            cityItems.some(ci => ci.slug === gi.slug)
          );
          if (hasMatch) {
            map.set(lg.locationName, toGroupId(city, country));
          }
        }
      }
    }
    return map;
  }, [countryGroups, locationGroups]);

  const filteredCountries = activeCountry
    ? new Map([...countryGroups.entries()].filter(([k]) => k === activeCountry))
    : countryGroups;

  const handleMapScrollToGroup = useCallback((groupName: string) => {
    const accordionId = locationToAccordionId.get(groupName);
    if (!accordionId) return;
    setExpandedAccordionId(accordionId);
    // scroll after a tick so the accordion expansion runs first
    setTimeout(() => {
      const el = document.getElementById(accordionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, [locationToAccordionId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div className="mb-8">
        <h1 className="text-4xl font-serif font-bold text-primary mb-4">{config.title}</h1>
        {config.description && (
          <p className="text-lg text-neutral-600 dark:text-neutral-500 max-w-2xl leading-relaxed">
            {config.description}
          </p>
        )}
      </div>

      {allCountries.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCountry(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              activeCountry === null
                ? 'bg-accent text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            全部
          </button>
          {allCountries.map((country) => (
            <button
              key={country}
              onClick={() => setActiveCountry(activeCountry === country ? null : country)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeCountry === country
                  ? 'bg-accent text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {country}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <div>
          {activeCountry && (
            <button
              onClick={() => setActiveCountry(null)}
              className="text-xs px-3 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm shadow-md border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
            >
              ← 返回全球
            </button>
          )}
        </div>
        {!activeCountry && (
          <button
            onClick={() => setViewMode(viewMode === 'map' ? 'globe' : 'map')}
            className="text-xs px-3 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm shadow-md border border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-accent hover:border-accent/30 transition-all"
          >
            {viewMode === 'map' ? '🌍 3D Globe' : '🗺️ Map'}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'globe' ? (
          <motion.div
            key="globe"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GlobeSection
              groups={locationGroups}
              onCountryClick={(country) => {
                setActiveCountry(country);
                setViewMode('map');
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MapSection
              groups={locationGroups}
              activeCountry={activeCountry}
              onScrollToGroup={handleMapScrollToGroup}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-10 space-y-1">
        {[...filteredCountries.entries()].map(([country, countryItems]) => {
          const cities = groupPhotosByCity(countryItems);
          return (
            <div key={country} className="mb-8">
              <h2 className="text-2xl font-serif font-semibold text-primary mb-4 pb-2 border-b border-neutral-200 dark:border-neutral-800">
                {country}
              </h2>
              {[...cities.entries()].map(([city, cityItems]) => (
                <CityAccordion
                  key={`${country}-${city}`}
                  cityName={city}
                  countryName={country}
                  items={cityItems}
                  groupId={toGroupId(city, country)}
                  forceOpen={toGroupId(city, country) === expandedAccordionId}
                />
              ))}
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="text-center py-20 text-neutral-500">
          <p className="text-lg">暂无照片</p>
        </div>
      )}
    </motion.div>
  );
}
