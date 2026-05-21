# Gallery Redesign: Geographic Hierarchy & Accordion

Date: 2025-05-21
Status: approved

## Summary

重构摄影画廊页面的分类和展示方式，从基于 GPS 坐标（~1km精度）的自动聚合改为**国家 → 城市 → 照片**三级地理手风琴浏览。同时建立 Lightroom → 脚本 → 网站的数据自动化管线，用户只需在 Lightroom 中填写 IPTC 元数据，导出 JPEG 后一条命令即可同步。

---

## Data Model Changes

### gallery.toml (auto-generated)

Each `[[items]]` gains a `country` field (ISO 3166-1 alpha-2 code) extracted from IPTC `Iptc4xmpCore:Country`:

```toml
[[items]]
title = "新葡京"
slug = "dsc-0013"
date = "2026-03"
country = "MO"           # ISO code from IPTC
location = "Macau"       # from IPTC City
camera = "NIKON D90"
lens = "50.0 mm f/1.8"
aperture = "f/7.1"
shutter = "1/500s"
iso = "250"
focal_length = "50mm"
image = "/gallery/dsc-0013.jpg"
content = "标准打卡点。"
lat = <from EXIF GPS>
lng = <from EXIF GPS>
```

### gallery-regions.toml (new, hand-maintained)

Mapping file for ISO codes → display names and city display name translations:

```toml
[countries]
HK = { display = "中国香港" }
MO = { display = "中国澳门" }
MY = { display = "Malaysia" }

[city_display]
HK = { Central = "中环", "Mong Kok" = "旺角", "Causeway Bay" = "铜锣湾", "West Kowloon" = "西九龙", "Yau Ma Tei" = "油麻地" }
MO = { Macau = "澳门" }
MY = { Sepang = "雪邦", "Kuala Lumpur" = "吉隆坡", Georgetown = "乔治市" }
```

This file is open-ended — new countries/cities added as needed.

### GalleryItem type extension

Add optional `country` field to `GalleryItem`:

```ts
export interface GalleryItem {
  country?: string;  // ISO 3166-1 alpha-2 code from IPTC
  // ... existing fields unchanged
}
```

---

## Lightroom → Site Pipeline

```
Lightroom
  ├─ EXIF auto: GPS, date, camera, lens, aperture, shutter, iso, focal length
  └─ IPTC manual: Title (→title), Caption (→content), City (→location), Country (→country ISO code)
       ↓
Export JPEG (preserve metadata)
       ↓
public/gallery/
       ↓
npm run gallery:sync
       ↓
scripts/generate-gallery.mjs
  ├─ Read .jpg from public/gallery/
  ├─ Extract EXIF + IPTC via exifr or exiftool
  ├─ Lookup country code → display name from gallery-regions.toml
  ├─ Lookup city English → display name from gallery-regions.toml
  └─ Output content/gallery.toml
       ↓
npm run build → static site
```

User only needs to fill 4 IPTC fields in Lightroom (Title, Caption, City, Country). Everything else is from EXIF.

---

## Component Architecture

### New: `CityAccordion.tsx`

Multi-open accordion, one per city per country.

```
CityAccordion
├── Header (click to toggle)
│   ├── Cover thumbnail (120×80px, first photo of city)
│   ├── City display name + English name + country
│   └── Photo count + chevron (rotates on open)
└── Body (framer-motion AnimatePresence height animation)
    └── Photo grid (3 cols desktop / 2 tablet / 1 mobile)
        └── Reuses existing PhotoCard
```

### New: `generate-gallery.mjs`

Node.js script reading JPEG metadata. Uses `exifr` library (or child_process calling exiftool).

### Modified: `gallery.ts`

- `getCountry(item)` → checks `item.country` ISO code first, looks up display name from mapping
- New `groupPhotosByCountry()` → groups items by ISO country code, returns hierarchical structure
- New `groupPhotosByCity(countryGroups)` → second-level grouping by city name
- Remove or deprecate `groupPhotosByLocation()` (no longer used for display grouping; may keep for map marker aggregation)

### Modified: `GalleryPage.tsx`

```
[3D Globe] — country markers from ISO codes
    │ click country
    ▼
[2D Map] — city markers within selected country
    │ click popup "查看照片" or manual scroll
    ▼
[Country filter pills: 全部 / 中国香港 / 中国澳门 / Malaysia]
[CityAccordion × N]
```

### Modified: `GalleryItem` type

Add `country?: string` field.

---

## Interaction Flow

1. Page loads → 3D globe with country-level markers (HK/MO/MY)
2. Click country marker → transition to 2D map, zoom to country bounds
3. Map shows city markers with photo count badges
4. Click popup "查看照片" → smooth scroll to city accordion below
5. City accordion expands → photo grid visible
6. Multiple cities can stay open simultaneously
7. Country filter pills toggle visibility of accordion sections
8. Scrolling to a group via map also auto-expands that city's accordion

## States & Edge Cases

- Photos without GPS → still appear in accordion under "Other" group (bottom of list)
- Photos without country → grouped under "未分类"
- No city field → grouped under country's "未分类" city
- All accordions start collapsed on page load
- Dark mode: header bg → `dark:bg-neutral-800`, border → `dark:border-neutral-700`
- Empty gallery page → show message "暂无照片"

## Visual Spec — Accordion Header

```
┌─────────────────────────────────────────────────┐
│ ┌──────────┐  中环  Central  中国香港   3 photos ▼ │
│ │ thumbnail│                                      │
│ │  3:2     │                                      │
│ └──────────┘                                      │
└─────────────────────────────────────────────────┘
```

- Header background: `bg-neutral-100 dark:bg-neutral-800`
- Border: rounded-xl, 1px border
- Chevron: Lucide `ChevronDown`, rotates 180° on open
- Animation: framer-motion `height: 0→auto`, 350ms easeInOut
- Gap between header and body: 16px
- Gap between accordion items: 12px

## Non-Goals

- Photo editing or watermarking (stays in Lightroom)
- Tag-based categorization (future)
- Infinite scroll or pagination (not needed at current photo count)
- Mobile split-view layout (maps stay full-width on mobile)

## Dependencies

- `exifr` npm package (JPEG metadata extraction)
- Existing: framer-motion, react-leaflet, @react-three/fiber, lucide-react
