'use client';

import { useLocaleStore } from '@/lib/stores/localeStore';
import GalleryPhotoPage from '@/components/pages/GalleryPhotoPage';
import type { GalleryPhotoMeta } from '@/lib/content';

interface GalleryPhotoClientProps {
  photosByLocale: Record<string, GalleryPhotoMeta | null>;
  defaultLocale: string;
}

export default function GalleryPhotoClient({ photosByLocale, defaultLocale }: GalleryPhotoClientProps) {
  const locale = useLocaleStore((state) => state.locale);
  const fallback = photosByLocale[defaultLocale] || Object.values(photosByLocale).find(p => p !== null);
  const photo = photosByLocale[locale] || fallback;

  if (!photo) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <GalleryPhotoPage photo={photo} />
    </div>
  );
}
