'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { GalleryPageConfig, GalleryItem, GalleryLocationGroup } from '@/types/page';
import { groupPhotosByLocation } from '@/lib/gallery';

const MapSection = dynamic(() => import('@/components/gallery/MapSection'), { ssr: false });

function toGroupId(name: string): string {
  return `gallery-group-${name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9一-鿿-]/g, '')}`;
}

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
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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

function LocationGroupSection({ group }: { group: GalleryLocationGroup }) {
  return (
    <section id={toGroupId(group.locationName)}>
      {group.locationName && (
        <h2 className="text-2xl font-serif font-semibold text-primary mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-800">
          {group.locationName}
        </h2>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {group.items.map((item, index) => (
          <PhotoCard key={item.slug} item={item} index={index} />
        ))}
      </div>
    </section>
  );
}

export default function GalleryPage({ config }: { config: GalleryPageConfig }) {
  const groups = groupPhotosByLocation(config.items);

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

      <MapSection groups={groups} />

      <div className="space-y-12">
        {groups.map((group) => (
          <LocationGroupSection key={group.locationName || `${group.lat},${group.lng}`} group={group} />
        ))}
      </div>
    </motion.div>
  );
}
