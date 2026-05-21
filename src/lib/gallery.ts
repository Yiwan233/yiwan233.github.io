import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'smol-toml';
import type { GalleryItem, GalleryLocationGroup } from '@/types/page';

interface RegionsConfig {
  countries?: Record<string, { display: string }>;
  city_display?: Record<string, string>;
}

let _regionsCache: RegionsConfig | null = null;

function loadRegions(): RegionsConfig {
  if (_regionsCache) return _regionsCache;
  try {
    const raw = readFileSync(join(process.cwd(), 'content', 'gallery-regions.toml'), 'utf-8');
    _regionsCache = parse(raw) as unknown as RegionsConfig;
  } catch {
    _regionsCache = { countries: {}, city_display: {} };
  }
  return _regionsCache;
}

export function getCountryCode(item: GalleryItem): string {
  return item.country || '';
}

export function getCountryDisplay(item: GalleryItem): string {
  const code = getCountryCode(item);
  if (!code) return '';
  const regions = loadRegions();
  return regions.countries?.[code]?.display || code;
}

export function getCityDisplay(item: GalleryItem): string {
  const code = getCountryCode(item);
  const city = item.location || '未分类';
  if (!code) return city;
  const regions = loadRegions();
  const key = `${code}.${city}`;
  return regions.city_display?.[key] || city;
}

export function groupPhotosByCountry(items: GalleryItem[]): Map<string, GalleryItem[]> {
  const map = new Map<string, GalleryItem[]>();
  for (const item of items) {
    const display = getCountryDisplay(item) || '未分类';
    if (!map.has(display)) map.set(display, []);
    map.get(display)!.push(item);
  }
  const sorted = new Map([...map.entries()].sort((a, b) => {
    if (a[0] === '未分类') return 1;
    if (b[0] === '未分类') return -1;
    return a[0].localeCompare(b[0]);
  }));
  return sorted;
}

export function groupPhotosByCity(countryItems: GalleryItem[]): Map<string, GalleryItem[]> {
  const map = new Map<string, GalleryItem[]>();
  for (const item of countryItems) {
    const display = getCityDisplay(item);
    if (!map.has(display)) map.set(display, []);
    map.get(display)!.push(item);
  }
  return map;
}

export function hasCoordinates(item: { lat?: number; lng?: number }): boolean {
  return (
    item.lat !== undefined &&
    item.lng !== undefined &&
    !isNaN(item.lat) &&
    !isNaN(item.lng) &&
    item.lat !== 0 &&
    item.lng !== 0
  );
}

export function groupPhotosByLocation(items: GalleryItem[]): GalleryLocationGroup[] {
  const groupsMap = new Map<string, GalleryLocationGroup>();
  const otherItems: GalleryItem[] = [];

  for (const item of items) {
    if (hasCoordinates(item)) {
      const key = `${item.lat!.toFixed(3)},${item.lng!.toFixed(3)}`;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          lat: item.lat!,
          lng: item.lng!,
          locationName: item.location || '',
          items: [],
        });
      }
      groupsMap.get(key)!.items.push(item);
    } else {
      otherItems.push(item);
    }
  }

  const groups = Array.from(groupsMap.values());

  groups.sort((a, b) => b.items.length - a.items.length || a.locationName.localeCompare(b.locationName));

  if (otherItems.length > 0) {
    groups.push({
      lat: 0,
      lng: 0,
      locationName: 'Other',
      items: otherItems,
    });
  }

  return groups;
}

export function getCountry(locationName: string): string {
  if (!locationName || locationName === 'Other') return '';
  const parts = locationName.split(',').map((s) => s.trim());
  return parts[parts.length - 1] || '';
}

export function getCountriesFromGroups(groups: GalleryLocationGroup[]): string[] {
  const countries = new Set<string>();
  for (const g of groups) {
    const country = getCountry(g.locationName);
    if (country) countries.add(country);
  }
  return Array.from(countries).sort();
}
