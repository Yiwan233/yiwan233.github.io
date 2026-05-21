import type { GalleryItem, GalleryLocationGroup } from '@/types/page';

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

export function groupPhotosByCountry(items: GalleryItem[]): Map<string, GalleryItem[]> {
  const map = new Map<string, GalleryItem[]>();
  for (const item of items) {
    const display = item.countryDisplay || '未分类';
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
    const display = item.cityDisplay || item.location || '未分类';
    if (!map.has(display)) map.set(display, []);
    map.get(display)!.push(item);
  }
  return map;
}
