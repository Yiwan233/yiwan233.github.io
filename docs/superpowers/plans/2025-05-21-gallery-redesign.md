# Gallery Redesign: Geographic Hierarchy & Accordion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor gallery from GPS-based grouping to Country→City→Photo geographic accordion browsing, with a Lightroom→JPEG→script→TOML+MD automation pipeline.

**Architecture:** New `gallery-regions.toml` maps ISO codes to display names. New `CityAccordion` handles multi-open accordion UI. `GalleryPage` is refactored to use city-level grouping. A Node.js script (`generate-gallery.mjs`) reads JPEG EXIF+IPTC metadata and auto-generates both `content/gallery.toml` and `content/gallery/*.md`.

**Tech Stack:** TypeScript, React, framer-motion, smol-toml, exifr (new dep), Node.js (scripts)

---

## File Structure

```
content/
├── gallery-regions.toml          NEW — ISO→display name mapping
├── gallery.toml                  MODIFIED — auto-generated, gains country field
├── gallery/*.md                  MODIFIED — auto-generated, gains country field

src/
├── types/page.ts                 MODIFIED — GalleryItem.country?: string
├── lib/
│   ├── gallery.ts                MODIFIED — new grouping fns, regions loading
│   └── content.ts                MODIFIED — GalleryPhotoMeta.country?: string
├── components/
│   ├── gallery/CityAccordion.tsx  NEW — multi-open city accordion
│   └── pages/GalleryPage.tsx     MODIFIED — city accordion replaces location sections

scripts/
├── generate-gallery.mjs          NEW — EXIF+IPTC → TOML+MD generator
```

---

### Task 1: Install exifr and add gallery:sync script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install exifr**

```bash
npm install --save-dev exifr
```

Expected: package.json and package-lock.json updated with exifr dependency.

- [ ] **Step 2: Add gallery:sync script**

Add `"gallery:sync": "node scripts/generate-gallery.mjs"` to `scripts` in `package.json`:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "gallery:sync": "node scripts/generate-gallery.mjs"
},
```

Edit `package.json`:

```json
"gallery:sync": "node scripts/generate-gallery.mjs"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add exifr dependency and gallery:sync script"
```

---

### Task 2: Create gallery-regions.toml

**Files:**
- Create: `content/gallery-regions.toml`

- [ ] **Step 1: Write the mapping file**

```toml
# ISO 3166-1 alpha-2 country codes → display names
# Add entries as you travel to new places.
[countries]
HK = { display = "中国香港" }
MO = { display = "中国澳门" }
MY = { display = "Malaysia" }

# Optional: city English → display name translations
[city_display]
HK.Central = "中环"
HK."Mong Kok" = "旺角"
HK."Causeway Bay" = "铜锣湾"
HK."West Kowloon" = "西九龙"
HK."Yau Ma Tei" = "油麻地"
MO.Macau = "澳门"
MY.Sepang = "雪邦"
MY."Kuala Lumpur" = "吉隆坡"
MY.Georgetown = "乔治市"
```

- [ ] **Step 2: Commit**

```bash
git add content/gallery-regions.toml
git commit -m "feat: add gallery region ISO code mapping"
```

---

### Task 3: Add country field to types

**Files:**
- Modify: `src/types/page.ts`
- Modify: `src/lib/content.ts` (GalleryPhotoMeta)

- [ ] **Step 1: Add country to GalleryItem**

In `src/types/page.ts`, add `country` to `GalleryItem`:

```ts
export interface GalleryItem {
    title: string;
    slug: string;
    date?: string;
    country?: string;       // ISO 3166-1 alpha-2
    location?: string;
    lat?: number;
    lng?: number;
    camera?: string;
    lens?: string;
    aperture?: string;
    shutter?: string;
    iso?: string;
    focal_length?: string;
    image: string;
    content?: string;
}
```

- [ ] **Step 2: Add country to GalleryPhotoMeta**

In `src/lib/content.ts`, add `country` to `GalleryPhotoMeta`:

```ts
export interface GalleryPhotoMeta {
  slug: string;
  title: string;
  date: string;
  country?: string;
  location: string;
  lat?: number;
  lng?: number;
  camera: string;
  lens: string;
  aperture: string;
  shutter: string;
  iso: string;
  focal_length: string;
  image: string;
  content: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/page.ts src/lib/content.ts
git commit -m "feat: add country field to gallery types"
```

---

### Task 4: Add regions loading and new grouping functions to gallery.ts

**Files:**
- Modify: `src/lib/gallery.ts` (rewrite grouping logic)

- [ ] **Step 1: Add regions config types and loader**

At top of `src/lib/gallery.ts`, add the types and loading function:

```ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'smol-toml';
import type { GalleryItem, GalleryLocationGroup } from '@/types/page';

interface RegionsConfig {
  countries: Record<string, { display: string }>;
  city_display: Record<string, string>;
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
  return regions.countries[code]?.display || code;
}

export function getCityKey(item: GalleryItem): string {
  return item.location || '未分类';
}

export function getCityDisplay(item: GalleryItem): string {
  const code = getCountryCode(item);
  const city = getCityKey(item);
  if (!code || !city) return city;
  const regions = loadRegions();
  const key = `${code}.${city}`;
  return regions.city_display[key] || city;
}

export function groupPhotosByCountry(items: GalleryItem[]): Map<string, GalleryItem[]> {
  const map = new Map<string, GalleryItem[]>();
  for (const item of items) {
    const display = getCountryDisplay(item) || '未分类';
    if (!map.has(display)) map.set(display, []);
    map.get(display)!.push(item);
  }
  // Sort: groups with items first, then alphabetically
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
```

- [ ] **Step 2: Keep existing hasCoordinates (needed by Globe/Map)**

Keep `hasCoordinates()`, `groupPhotosByLocation()`, and `getCountry()` (the legacy version, for backward compat with MapSection) unchanged. These are still used by `GlobeSection` and `MapSection`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gallery.ts
git commit -m "feat: add country/city grouping functions and regions loader"
```

---

### Task 5: Create CityAccordion component

**Files:**
- Create: `src/components/gallery/CityAccordion.tsx`

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { GalleryItem } from '@/types/page';

function PhotoCard({ item, index }: { item: GalleryItem; index: number }) {
  return (
    <motion.div
      key={item.slug}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * index }}
    >
      <Link
        href={`/gallery/${item.slug}`}
        className="group block bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
      >
        <div className="aspect-[4/3] bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 polaroid-develop"
            style={{ animationDelay: `${0.08 * index}s` }}
            loading="lazy"
          />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-primary mb-1 group-hover:text-accent transition-colors">
            {item.title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
            {item.location && <span>{item.location}</span>}
            {item.date && (
              <>
                <span className="text-neutral-300 dark:text-neutral-600">·</span>
                <span>{item.date}</span>
              </>
            )}
          </div>
          {item.content && (
            <p className="text-sm text-neutral-600 dark:text-neutral-500 line-clamp-2">
              {item.content}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

interface CityAccordionProps {
  cityName: string;
  countryName: string;
  items: GalleryItem[];
  groupId: string;
}

export default function CityAccordion({ cityName, countryName, items, groupId }: CityAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const coverImage = items[0]?.image || '';
  const count = items.length;

  return (
    <section id={groupId} className="mb-3">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-left"
      >
        {/* Cover thumbnail */}
        {coverImage && (
          <div className="w-[120px] h-[80px] flex-shrink-0 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-700">
            <img
              src={coverImage}
              alt={cityName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* City info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-primary">{cityName}</h3>
          <p className="text-sm text-neutral-500">{countryName}</p>
        </div>

        {/* Count + chevron */}
        <div className="flex items-center gap-2 text-sm text-neutral-500 flex-shrink-0">
          <span>{count} photo{count !== 1 ? 's' : ''}</span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </div>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item, index) => (
                <PhotoCard key={item.slug} item={item} index={index} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function toGroupId(cityName: string, countryName: string): string {
  return `gallery-group-${countryName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9一-鿿\-]/g, '')}-${cityName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9一-鿿\-]/g, '')}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gallery/CityAccordion.tsx
git commit -m "feat: add CityAccordion component with multi-open accordion"
```

### Task 5a: Update GlobeSection to use explicit country field

**Files:**
- Modify: `src/components/gallery/GlobeSection.tsx`

- [ ] **Step 1: Update buildCountryAggs to use item.country + regions mapping**

Add import and update the `buildCountryAggs` function inside `GlobeSection.tsx` to prefer explicit country codes:

```tsx
import { getCountryDisplay } from '@/lib/gallery';

function buildCountryAggs(groups: GalleryLocationGroup[]): CountryAgg[] {
  const map = new Map<string, CountryAgg>();
  for (const g of groups) {
    if (g.lat === 0 && g.lng === 0) continue;
    const firstItem = g.items[0];
    const name = firstItem?.country ? getCountryDisplay(firstItem) : getCountry(g.locationName);
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gallery/GlobeSection.tsx
git commit -m "fix: use explicit country field for globe country markers"
```

---

### Task 5b: Update MapSection to match countries via explicit field

**Files:**
- Modify: `src/components/gallery/MapSection.tsx`

- [ ] **Step 1: Update country filter in MapSection**

Import and use `getCountryDisplay` to filter by display name when items have explicit country codes. Replace the `visible` computation in `MapSection`:

```tsx
import { getCountryDisplay } from '@/lib/gallery';

export default function MapSection({ ... }: { ... }) {
  const located = groups.filter((g) => g.lat !== 0 && g.lng !== 0);
  if (located.length === 0) return null;

  const visible = activeCountry
    ? located.filter((g) => {
        const firstItem = g.items[0];
        return firstItem?.country
          ? getCountryDisplay(firstItem) === activeCountry
          : getCountry(g.locationName) === activeCountry;
      })
    : located;
  // ...rest unchanged
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gallery/MapSection.tsx
git commit -m "fix: use explicit country field for map country filter"
```

---

### Task 6: Rewrite GalleryPage to use country→city hierarchy

**Files:**
- Modify: `src/components/pages/GalleryPage.tsx`

- [ ] **Step 1: Rewrite GalleryPage**

Replace the file content. GlobeSection and MapSection keep receiving `GalleryLocationGroup[]` (backward compat via `groupPhotosByLocation()`). The accordion section uses the new `groupPhotosByCountry/groupPhotosByCity`. The `handleScrollToGroup` bridges MapSection group names to accordion IDs:

```tsx
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

  // Two grouping systems: location groups (for maps) and country→city (for accordion)
  const locationGroups = useMemo(() => groupPhotosByLocation(items), [items]);
  const countryGroups = useMemo(() => groupPhotosByCountry(items), [items]);
  const allCountries = [...countryGroups.keys()];

  const filteredCountries = activeCountry
    ? new Map([...countryGroups.entries()].filter(([k]) => k === activeCountry))
    : countryGroups;

  // Bridge MapSection group name → accordion scroll
  const handleMapScrollToGroup = useCallback((groupName: string) => {
    // Find which country/city contains photos matching this location group
    for (const [country, countryItems] of countryGroups.entries()) {
      const cities = groupPhotosByCity(countryItems);
      for (const [city, cityItems] of cities.entries()) {
        const group = locationGroups.find(g => g.locationName === groupName);
        if (group && group.items.some(gi => cityItems.some(ci => ci.slug === gi.slug))) {
          const el = document.getElementById(toGroupId(city, country));
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
      }
    }
  }, [countryGroups, locationGroups]);

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

      {/* Country filter pills */}
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

      {/* Globe / Map */}
      <AnimatePresence mode="wait">
        {activeCountry === null ? (
          <motion.div
            key="globe"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <GlobeSection
              groups={locationGroups}
              onCountryClick={(country) => setActiveCountry(country)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="map"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <div className="mb-3">
              <button
                onClick={() => setActiveCountry(null)}
                className="text-xs px-3 py-1.5 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-sm shadow-md border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 transition-colors"
              >
                ← 返回全球
              </button>
            </div>
            <MapSection
              groups={locationGroups}
              activeCountry={activeCountry}
              onScrollToGroup={handleMapScrollToGroup}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* City accordions */}
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
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-20 text-neutral-500">
          <p className="text-lg">暂无照片</p>
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pages/GalleryPage.tsx
git commit -m "feat: refactor GalleryPage to country→city accordion layout"
```

---

### Task 7: Write generate-gallery.mjs

**Files:**
- Create: `scripts/generate-gallery.mjs`

- [ ] **Step 1: Write the metadata extraction and generation script**

```js
#!/usr/bin/env node

// generate-gallery.mjs — Extract EXIF+IPTC from public/gallery/*.jpg
// Generates: content/gallery.toml and content/gallery/<slug>.md

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as tomlParse } from 'smol-toml';
import * as exifr from 'exifr';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GALLERY_DIR = join(ROOT, 'public', 'gallery');
const CONTENT_DIR = join(ROOT, 'content');
const GALLERY_MD_DIR = join(CONTENT_DIR, 'gallery');

function loadRegions() {
  const p = join(CONTENT_DIR, 'gallery-regions.toml');
  try {
    return tomlParse(readFileSync(p, 'utf-8'));
  } catch {
    return { countries: {}, city_display: {} };
  }
}

function getDisplayName(code, regions) {
  if (!code) return null;
  const entry = regions.countries?.[code];
  return entry?.display || code;
}

function getCityDisplay(code, city, regions) {
  if (!code || !city) return city;
  const key = `${code}.${city}`;
  return regions.city_display?.[key] || city;
}

function slugify(filename) {
  return filename.replace(/\.(jpg|jpeg|png)$/i, '')
    .replace(/[^a-zA-Z0-9一-鿿_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function tomlEscape(s) {
  if (!s) return '""';
  // Escape special TOML characters
  return JSON.stringify(s);
}

async function processPhoto(file, regions) {
  const filePath = join(GALLERY_DIR, file);
  const tags = await exifr.parse(filePath, {
    exif: true,
    iptc: true,
    xmp: true,
    gps: true,
  });

  if (!tags) {
    console.warn(`⚠ No metadata found for ${file}, skipping`);
    return null;
  }

  const slug = slugify(file);
  const title = tags.XMPTitle || tags.ObjectName || file.replace(/\.(jpg|jpeg|png)$/i, '');
  const description = tags.XMPDescription || tags.Description || '';
  const city = tags.City || '';
  const countryCode = (tags.CountryCode || tags.Country || '').trim();
  const date = tags.DateTimeOriginal || tags.CreateDate || '';

  // Format date as YYYY-MM
  let dateStr = '';
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }

  // GPS
  let lat = undefined, lng = undefined;
  if (tags.latitude != null && tags.longitude != null) {
    lat = tags.latitude;
    lng = tags.longitude;
  }

  // Camera
  const camera = `${tags.Make || ''} ${tags.Model || ''}`.trim() || 'Unknown';
  const lens = tags.LensModel || '';
  const aperture = tags.FNumber ? `f/${tags.FNumber}` : '';
  const shutter = tags.ExposureTime ? `${tags.ExposureTime < 1 ? `1/${Math.round(1/tags.ExposureTime)}` : tags.ExposureTime}s` : '';
  const iso = tags.ISO?.toString() || '';
  const focal = tags.FocalLength ? `${tags.FocalLength}mm` : '';

  return {
    slug,
    title: title || slug,
    date: dateStr,
    country: countryCode,
    location: city,
    lat: lat?.toFixed(6),
    lng: lng?.toFixed(6),
    camera,
    lens,
    aperture,
    shutter,
    iso,
    focal_length: focal,
    image: `/gallery/${file}`,
    content: description,
  };
}

function generateTOML(items) {
  let toml = 'type = "gallery"\n';
  toml += 'title = "Gallery"\n';
  toml += 'description = "Moments captured through my lens — urban exploration, landscapes, and the stories behind each frame."\n\n';

  for (const item of items) {
    toml += '[[items]]\n';
    toml += `title = ${tomlEscape(item.title)}\n`;
    toml += `slug = ${tomlEscape(item.slug)}\n`;
    if (item.date) toml += `date = ${tomlEscape(item.date)}\n`;
    if (item.country) toml += `country = ${tomlEscape(item.country)}\n`;
    if (item.location) toml += `location = ${tomlEscape(item.location)}\n`;
    if (item.lat != null) toml += `lat = ${item.lat}\n`;
    if (item.lng != null) toml += `lng = ${item.lng}\n`;
    if (item.camera) toml += `camera = ${tomlEscape(item.camera)}\n`;
    if (item.lens) toml += `lens = ${tomlEscape(item.lens)}\n`;
    if (item.aperture) toml += `aperture = ${tomlEscape(item.aperture)}\n`;
    if (item.shutter) toml += `shutter = ${tomlEscape(item.shutter)}\n`;
    if (item.iso) toml += `iso = ${tomlEscape(item.iso)}\n`;
    if (item.focal_length) toml += `focal_length = ${tomlEscape(item.focal_length)}\n`;
    toml += `image = ${tomlEscape(item.image)}\n`;
    if (item.content) {
      toml += `content = """${item.content.replace(/"/g, '\\"')}"""\n`;
    }
    toml += '\n';
  }

  return toml;
}

function generateMD(item) {
  return `---
title: "${item.title}"
date: "${item.date}"
slug: "${item.slug}"
${item.country ? `country: "${item.country}"\n` : ''}\
${item.location ? `location: "${item.location}"\n` : ''}\
${item.lat != null ? `lat: "${item.lat}"\n` : ''}\
${item.lng != null ? `lng: "${item.lng}"\n` : ''}\
camera: "${item.camera}"
lens: "${item.lens}"
aperture: "${item.aperture}"
shutter: "${item.shutter}"
iso: "${item.iso}"
focal_length: "${item.focal_length}"
image: "${item.image}"
---

${item.content}
`;
}

async function main() {
  console.log('🔍 Scanning public/gallery/ for JPEGs...\n');

  if (!existsSync(GALLERY_DIR)) {
    console.error('❌ public/gallery/ directory not found');
    process.exit(1);
  }

  const files = readdirSync(GALLERY_DIR).filter(f => /\.(jpg|jpeg)$/i.test(f));

  if (files.length === 0) {
    console.log('⚠ No JPEG files found in public/gallery/');
    return;
  }

  console.log(`Found ${files.length} photos\n`);

  const regions = loadRegions();
  const items = [];

  for (const file of files) {
    console.log(`  Processing: ${file}`);
    const item = await processPhoto(file, regions);
    if (item) items.push(item);
  }

  // Sort by date descending
  items.sort((a, b) => b.date.localeCompare(a.date));

  console.log(`\n✅ ${items.length} photos processed\n`);

  // Generate TOML
  const tomlOutput = generateTOML(items);
  writeFileSync(join(CONTENT_DIR, 'gallery.toml'), tomlOutput, 'utf-8');
  console.log('📄 Wrote content/gallery.toml');

  // Generate MD files
  if (!existsSync(GALLERY_MD_DIR)) {
    mkdirSync(GALLERY_MD_DIR, { recursive: true });
  }
  for (const item of items) {
    const md = generateMD(item);
    writeFileSync(join(GALLERY_MD_DIR, `${item.slug}.md`), md, 'utf-8');
  }
  console.log(`📄 Wrote ${items.length} content/gallery/*.md files`);

  console.log('\n🎉 Done! Run `npm run dev` to see changes.\n');
}

main().catch(console.error);
```

- [ ] **Step 2: Test the script**

```bash
node scripts/generate-gallery.mjs
```

Expected: Script scans `public/gallery/`, extracts metadata from existing JPEGs, and outputs `content/gallery.toml` and `content/gallery/*.md` files. Verify the output matches existing format.

- [ ] **Step 3: Update existing gallery.toml and MD files with country fields**

Since we already have photos in `public/gallery/`, run the script to regenerate all gallery data with the new `country` field from EXIF/IPTC:

```bash
node scripts/generate-gallery.mjs
```

Note: If existing JPEGs don't have country IPTC set, the `country` field will be empty. For now, manually add `country = "MO"` / `country = "HK"` / `country = "MY"` to the TOML entries as a bridge until you re-export from Lightroom with Country IPTC metadata.

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-gallery.mjs content/gallery.toml content/gallery/*.md
git commit -m "feat: add generate-gallery.mjs for EXIF→TOML+MD automation"
```

---

### Task 8: Verify build and test

**Files:**
- No new files

- [ ] **Step 1: Run the dev server and verify gallery page loads**

```bash
npm run dev
```

Open http://localhost:3000/gallery and check:
- [ ] 3D globe renders with country markers
- [ ] Country filter pills show (中国香港 / 中国澳门 / Malaysia)
- [ ] City accordions render with correct names
- [ ] Click to expand an accordion — photos appear with animation
- [ ] Multiple accordions can be open simultaneously
- [ ] Click a country pill — page filters to only that country

- [ ] **Step 2: Run build to verify static generation works**

```bash
npm run build
```

Expected: Build succeeds without errors. All `/gallery/[slug]` static pages generated.

- [ ] **Step 3: Check responsive layout**

Resize browser window:
- [ ] Desktop: 3-column photo grid
- [ ] Tablet: 2-column grid
- [ ] Mobile: 1-column grid
- [ ] Dark mode toggle: accordion header colors update

- [ ] **Step 4: Commit any fixes found during testing**

```bash
git add --all
git commit -m "fix: address issues found in gallery testing"
```

---

### Task 9: Update .gitignore for generated content (optional)

**Files:**
- Modify: `.gitignore`

This step is optional — if you want `content/gallery.toml` and `content/gallery/*.md` to be treated as generated artifacts:

- [ ] **Step 1: Add generated content to .gitignore**

If you decide to gitignore generated files:

```gitignore
# auto-generated gallery content
content/gallery.toml
content/gallery/
```

But keep `content/gallery-regions.toml` tracked (it's hand-maintained).

Alternatively, keep everything tracked for now and decide later.

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore auto-generated gallery content"
```
