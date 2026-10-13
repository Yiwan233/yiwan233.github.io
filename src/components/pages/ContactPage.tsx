'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Linkedin } from 'lucide-react';
import { ContactPageConfig } from '@/types/page';
import type { SiteConfig } from '@/lib/config';
import { useMessages } from '@/lib/i18n/useMessages';

// Xiaohongshu (RED) wordmark-style icon
const XiaohongshuIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="4" width="22" height="16" rx="4" fill="currentColor" />
        <text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="white" fontFamily="sans-serif">RED</text>
    </svg>
);

interface ContactPageProps {
    config: ContactPageConfig;
    social?: SiteConfig['social'];
}

export default function ContactPage({ config, social }: ContactPageProps) {
    const messages = useMessages();

    const elsewhereLinks = [
        ...(social?.github ? [{ label: 'GitHub', href: social.github, icon: Github }] : []),
        ...(social?.linkedin ? [{ label: 'LinkedIn', href: social.linkedin, icon: Linkedin }] : []),
        ...(social?.xiaohongshu ? [{
            label: `${messages.profile.xiaohongshu}: ${social.xiaohongshu}`,
            href: social.xiaohongshu_url || `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(social.xiaohongshu)}`,
            icon: XiaohongshuIcon,
        }] : []),
    ];
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!config.form_endpoint) {
            // If no endpoint, just show a message
            setStatus('success');
            return;
        }

        setStatus('sending');
        const form = e.currentTarget;
        const formData = new FormData(form);

        try {
            const response = await fetch(config.form_endpoint, {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json',
                },
            });

            if (response.ok) {
                setStatus('success');
                form.reset();
            } else {
                setStatus('error');
            }
        } catch {
            setStatus('error');
        }
    };

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

            {elsewhereLinks.length > 0 && (
                <div className="mb-8 max-w-2xl">
                    <h2 className="text-sm font-medium text-primary mb-3">{messages.contact.elsewhere}</h2>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {elsewhereLinks.map((link) => {
                            const IconComponent = link.icon;
                            return (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center space-x-2 text-neutral-600 dark:text-neutral-400 hover:text-accent transition-colors duration-200"
                                >
                                    <IconComponent className="h-5 w-5" />
                                    <span>{link.label}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}

            {config.form_endpoint ? (
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                    <input type="text" name="_honey" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                    <input type="hidden" name="_template" value="table" />
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-primary mb-2">
                            {messages.contact.name}
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors duration-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-primary mb-2">
                            {messages.contact.email}
                        </label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors duration-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-primary mb-2">
                            {messages.contact.subject}
                        </label>
                        <input
                            type="text"
                            id="subject"
                            name="subject"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors duration-200"
                        />
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-primary mb-2">
                            {messages.contact.message}
                        </label>
                        <textarea
                            id="message"
                            name="message"
                            rows={6}
                            required
                            className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors duration-200 resize-y"
                        />
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={status === 'sending'}
                            className="px-6 py-3 bg-accent hover:bg-accent-dark text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'sending' ? messages.contact.sending : messages.contact.send}
                        </button>
                    </div>
                    {status === 'success' && (
                        <p className="text-success font-medium">{messages.contact.success}</p>
                    )}
                    {status === 'error' && (
                        <p className="text-error font-medium">{messages.contact.error}</p>
                    )}
                </form>
            ) : (
                config.email && (
                    <p className="text-lg text-neutral-600 dark:text-neutral-500">
                        <a href={`mailto:${config.email}`} className="text-accent hover:underline">
                            {config.email}
                        </a>
                    </p>
                )
            )}
        </motion.div>
    );
}
