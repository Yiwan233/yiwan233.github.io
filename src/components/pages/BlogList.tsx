'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { BlogPageConfig } from '@/types/page';
import { BlogPostMeta } from '@/lib/content';
import { useMessages } from '@/lib/i18n/useMessages';

interface BlogListProps {
    config: BlogPageConfig;
    posts: BlogPostMeta[];
}

export default function BlogList({ config, posts }: BlogListProps) {
    const messages = useMessages();

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

            {posts.length === 0 ? (
                <p className="text-neutral-500">{messages.blog.noPosts}</p>
            ) : (
                <div className="grid gap-6">
                    {posts.map((post, index) => (
                        <motion.div
                            key={post.slug}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 * index }}
                        >
                            <Link href={`/blog/${post.slug}`} className="block">
                                <div className="bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 hover:shadow-lg transition-all duration-200 hover:scale-[1.01]">
                                    <div className="flex justify-between items-start mb-2">
                                        <h2 className="text-xl font-semibold text-primary">{post.title}</h2>
                                        {post.date && (
                                            <span className="text-sm text-neutral-500 font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded">
                                                {post.date}
                                            </span>
                                        )}
                                    </div>
                                    {post.summary && (
                                        <p className="text-base text-neutral-600 dark:text-neutral-500 leading-relaxed mb-3">
                                            {post.summary}
                                        </p>
                                    )}
                                    {post.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {post.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 px-2 py-1 rounded border border-neutral-100 dark:border-neutral-800"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
}
