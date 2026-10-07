'use client';

import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

export interface BlockItem {
    title?: string;
    tag?: string;
    content: string;
}

interface BlocksProps {
    title?: string;
    description?: string;
    layout?: 'grid' | 'quote';
    items: BlockItem[];
}

const inline = {
    p: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-primary">{children}</strong>,
    em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
};

export default function Blocks({ title, description, layout = 'grid', items }: BlocksProps) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
        >
            {title && <h2 className="text-2xl font-serif font-bold text-primary mb-4">{title}</h2>}
            {description && (
                <p className="text-neutral-700 dark:text-neutral-600 leading-relaxed mb-4">{description}</p>
            )}

            {layout === 'quote' ? (
                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className="relative rounded-lg border border-accent/30 bg-accent/5 px-6 py-5"
                        >
                            <span aria-hidden className="absolute left-3 top-1 font-serif text-4xl leading-none text-accent/40">“</span>
                            <p className="pl-4 font-serif text-lg leading-relaxed text-neutral-700 dark:text-neutral-600">
                                <ReactMarkdown components={inline}>{item.content}</ReactMarkdown>
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`grid grid-cols-1 gap-4 ${items.length % 3 === 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    {items.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 * index }}
                            className="bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-neutral-200 dark:border-[rgba(148,163,184,0.24)] hover:shadow-lg transition-all duration-200"
                        >
                            {item.tag && (
                                <p className="text-xs font-medium uppercase tracking-wide text-accent mb-1">{item.tag}</p>
                            )}
                            {item.title && (
                                <h3 className="font-semibold text-primary mb-2 leading-tight">{item.title}</h3>
                            )}
                            <p className="text-sm text-neutral-600 dark:text-neutral-500 leading-relaxed">
                                <ReactMarkdown components={inline}>{item.content}</ReactMarkdown>
                            </p>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.section>
    );
}
