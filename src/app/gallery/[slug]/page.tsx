import { notFound } from 'next/navigation';
import { getGalleryPhoto, getGalleryPhotos } from '@/lib/content';
import { getConfig } from '@/lib/config';
import { getRuntimeI18nConfig } from '@/lib/i18n/config';
import { Metadata } from 'next';
import GalleryPhotoClient from './GalleryPhotoClient';

const GALLERY_DIR = 'gallery';

export function generateStaticParams() {
  const config = getConfig();
  const runtimeI18n = getRuntimeI18nConfig(config.i18n);
  const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];

  const params: { slug: string }[] = [];
  const seen = new Set<string>();

  for (const locale of targetLocales) {
    const photos = getGalleryPhotos(GALLERY_DIR, locale);
    for (const photo of photos) {
      if (!seen.has(photo.slug)) {
        seen.add(photo.slug);
        params.push({ slug: photo.slug });
      }
    }
  }

  if (params.length === 0) {
    const defaultPhotos = getGalleryPhotos(GALLERY_DIR);
    for (const photo of defaultPhotos) {
      if (!seen.has(photo.slug)) {
        seen.add(photo.slug);
        params.push({ slug: photo.slug });
      }
    }
  }

  return params;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const photo = getGalleryPhoto(GALLERY_DIR, slug);

  if (!photo) {
    return {};
  }

  return {
    title: photo.title,
    description: photo.content.slice(0, 160),
  };
}

export default async function GalleryPhotoRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const config = getConfig();
  const runtimeI18n = getRuntimeI18nConfig(config.i18n);
  const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];

  const photosByLocale: Record<string, ReturnType<typeof getGalleryPhoto>> = {};

  for (const locale of targetLocales) {
    const photo = getGalleryPhoto(GALLERY_DIR, slug, locale);
    if (photo) {
      photosByLocale[locale] = photo;
    }
  }

  const defaultPhoto = getGalleryPhoto(GALLERY_DIR, slug);
  if (defaultPhoto && !photosByLocale[runtimeI18n.defaultLocale]) {
    photosByLocale[runtimeI18n.defaultLocale] = defaultPhoto;
  }

  if (Object.keys(photosByLocale).length === 0) {
    notFound();
  }

  return <GalleryPhotoClient photosByLocale={photosByLocale} defaultLocale={runtimeI18n.defaultLocale} />;
}
