'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ContactPageConfig } from '@/types/page';
import { useMessages } from '@/lib/i18n/useMessages';

interface ContactPageProps {
    config: ContactPageConfig;
}

export default function ContactPage({ config }: ContactPageProps) {
    const messages = useMessages();
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

            {config.form_endpoint ? (
                <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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
                <div className="text-neutral-500">
                    <p>Please configure a form endpoint to enable the contact form.</p>
                </div>
            )}
        </motion.div>
    );
}
