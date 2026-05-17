'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { BlogPostMeta } from '@/lib/content';
import { useMessages } from '@/lib/i18n/useMessages';

const markdownComponents = {
    h1: ({ children }: React.ComponentProps<'h1'>) => (
        <h1 className="text-3xl font-serif font-bold text-primary mt-8 mb-4">{children}</h1>
    ),
    h2: ({ children }: React.ComponentProps<'h2'>) => (
        <h2 className="text-2xl font-serif font-semibold text-primary mt-6 mb-3">{children}</h2>
    ),
    h3: ({ children }: React.ComponentProps<'h3'>) => (
        <h3 className="text-xl font-semibold text-primary mt-5 mb-2">{children}</h3>
    ),
    p: ({ children }: React.ComponentProps<'p'>) => (
        <p className="mb-4 text-neutral-700 dark:text-neutral-300 leading-relaxed">{children}</p>
    ),
    ul: ({ children }: React.ComponentProps<'ul'>) => (
        <ul className="list-disc list-inside mb-4 space-y-1 text-neutral-700 dark:text-neutral-300">{children}</ul>
    ),
    ol: ({ children }: React.ComponentProps<'ol'>) => (
        <ol className="list-decimal list-inside mb-4 space-y-1 text-neutral-700 dark:text-neutral-300">{children}</ol>
    ),
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
    strong: ({ children }: React.ComponentProps<'strong'>) => (
        <strong className="font-semibold text-primary">{children}</strong>
    ),
    em: ({ children }: React.ComponentProps<'em'>) => <em className="italic">{children}</em>,
    code: ({ children }: React.ComponentProps<'code'>) => (
        <code className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[0.95em]">{children}</code>
    ),
    pre: ({ children }: React.ComponentProps<'pre'>) => (
        <pre className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4 mb-4 overflow-x-auto text-sm">
            {children}
        </pre>
    ),
    hr: () => <hr className="my-8 border-neutral-200 dark:border-neutral-700" />,
};

interface BlogPostProps {
    post: BlogPostMeta;
}

export default function BlogPost({ post }: BlogPostProps) {
    const messages = useMessages();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
        >
            <div className="mb-8">
                <Link
                    href="/blog"
                    className="text-accent hover:text-accent-dark transition-colors duration-200 text-sm font-medium"
                >
                    &larr; {messages.blog.backToList}
                </Link>
            </div>

            <article>
                <header className="mb-8">
                    <h1 className="text-4xl font-serif font-bold text-primary mb-3">{post.title}</h1>
                    <div className="flex items-center gap-4 text-neutral-500">
                        {post.date && <time className="text-sm">{post.date}</time>}
                    </div>
                    {post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-4">
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
                </header>

                <div className="prose-neutral dark:prose-invert max-w-none">
                    <ReactMarkdown components={markdownComponents}>{post.content}</ReactMarkdown>
                </div>
            </article>
        </motion.div>
    );
}
