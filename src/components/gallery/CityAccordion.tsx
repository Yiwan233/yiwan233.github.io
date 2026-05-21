'use client';

import { useState, useEffect } from 'react';
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
  forceOpen?: boolean;
}

export default function CityAccordion({ cityName, countryName, items, groupId, forceOpen }: CityAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const coverImage = items[0]?.image || '';
  const count = items.length;

  return (
    <section id={groupId} className="mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-4 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-left"
      >
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

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-primary">{cityName}</h3>
          <p className="text-sm text-neutral-500">{countryName}</p>
        </div>

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
