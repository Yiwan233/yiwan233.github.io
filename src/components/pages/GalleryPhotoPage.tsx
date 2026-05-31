'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { GalleryPhotoMeta } from '@/lib/content';

const markdownComponents = {
    h1: ({ children }: React.ComponentProps<'h1'>) => <h1 className="text-3xl font-serif font-bold text-primary mt-8 mb-4">{children}</h1>,
    h2: ({ children }: React.ComponentProps<'h2'>) => <h2 className="text-2xl font-serif font-bold text-primary mt-8 mb-4 border-b border-neutral-200 dark:border-neutral-800 pb-2">{children}</h2>,
    h3: ({ children }: React.ComponentProps<'h3'>) => <h3 className="text-xl font-semibold text-primary mt-6 mb-3">{children}</h3>,
    p: ({ children }: React.ComponentProps<'p'>) => <p className="mb-4 last:mb-0">{children}</p>,
    ul: ({ children }: React.ComponentProps<'ul'>) => <ul className="list-disc list-inside mb-4 space-y-1 ml-4">{children}</ul>,
    ol: ({ children }: React.ComponentProps<'ol'>) => <ol className="list-decimal list-inside mb-4 space-y-1 ml-4">{children}</ol>,
    li: ({ children }: React.ComponentProps<'li'>) => <li className="mb-1">{children}</li>,
    a: ({ ...props }) => (
        <a
            {...props}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-medium transition-all duration-200 rounded hover:bg-accent/10 hover:shadow-sm"
        />
    ),
    blockquote: ({ children }: React.ComponentProps<'blockquote'>) => (
        <blockquote className="border-l-4 border-accent/50 pl-4 italic my-4 text-neutral-600 dark:text-neutral-500">
            {children}
        </blockquote>
    ),
    strong: ({ children }: React.ComponentProps<'strong'>) => <strong className="font-semibold text-primary">{children}</strong>,
    em: ({ children }: React.ComponentProps<'em'>) => <em className="italic text-neutral-600 dark:text-neutral-500">{children}</em>,
};

interface GalleryPhotoPageProps {
    photo: GalleryPhotoMeta;
}

export default function GalleryPhotoPage({ photo }: GalleryPhotoPageProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
        >
            <Link
                href="/gallery"
                className="inline-flex items-center text-sm text-neutral-500 hover:text-accent transition-colors mb-6"
            >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Gallery
            </Link>

            <div className="mb-8">
                <h1 className="text-4xl font-serif font-bold text-primary mb-3">{photo.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                    {photo.location && (
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {photo.location}
                        </span>
                    )}
                    {photo.camera && (
                        <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {photo.camera}
                        </span>
                    )}
                    {photo.date && <span>{photo.date}</span>}
                </div>
            </div>

            <div className="rounded-xl overflow-hidden mb-8 shadow-lg polaroid-frame">
                <img
                    src={photo.image}
                    alt={photo.title}
                    className="w-full h-auto polaroid-develop"
                />
            </div>

            <div className="text-neutral-700 dark:text-neutral-600 leading-relaxed">
                <ReactMarkdown components={markdownComponents}>
                    {photo.content}
                </ReactMarkdown>
            </div>
        </motion.div>
    );
}
