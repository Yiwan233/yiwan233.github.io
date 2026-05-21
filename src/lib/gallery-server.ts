import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'smol-toml';
import type { GalleryItem } from '@/types/page';

interface RegionsConfig {
  countries?: Record<string, { display: string }>;
  city_display?: Record<string, string>;
}

let _regionsCache: RegionsConfig | null = null;

export function loadRegions(): RegionsConfig {
  if (_regionsCache) return _regionsCache;
  try {
    const raw = readFileSync(join(process.cwd(), 'content', 'gallery-regions.toml'), 'utf-8');
    _regionsCache = parse(raw) as unknown as RegionsConfig;
  } catch {
    _regionsCache = { countries: {}, city_display: {} };
  }
  return _regionsCache;
}

export function getCountryDisplay(code: string, regions?: RegionsConfig): string {
  if (!code) return '';
  const r = regions || loadRegions();
  return r.countries?.[code]?.display || code;
}

export function getCityDisplay(code: string, city: string, regions?: RegionsConfig): string {
  if (!code) return city;
  const r = regions || loadRegions();
  const key = `${code}.${city}`;
  return r.city_display?.[key] || city;
}

export function decorateItems(items: GalleryItem[]): GalleryItem[] {
  const regions = loadRegions();
  return items.map(item => {
    const code = item.country || '';
    const city = item.location || '';
    return {
      ...item,
      countryDisplay: code ? getCountryDisplay(code, regions) : '',
      cityDisplay: code ? getCityDisplay(code, city, regions) : city,
    };
  });
}
