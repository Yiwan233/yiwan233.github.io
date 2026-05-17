import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getBlogPosts, getBlogPost } from '@/lib/content';
import { getConfig } from '@/lib/config';
import { getRuntimeI18nConfig } from '@/lib/i18n/config';
import BlogPostClient from './BlogPostClient';
import type { BlogPostMeta } from '@/lib/content';

const BLOG_DIR = 'blog';

function loadBlogPostData(slug: string, locale?: string): BlogPostMeta | null {
    return getBlogPost(BLOG_DIR, slug, locale);
}

export function generateStaticParams() {
    const config = getConfig();
    const runtimeI18n = getRuntimeI18nConfig(config.i18n);
    const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];

    const slugs = new Set<string>();
    for (const locale of targetLocales) {
        const posts = getBlogPosts(BLOG_DIR, locale);
        for (const post of posts) {
            slugs.add(post.slug);
        }
    }

    return Array.from(slugs).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = loadBlogPostData(slug);
    if (!post) return {};

    return {
        title: post.title,
        description: post.summary,
    };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    const baseConfig = getConfig();
    const runtimeI18n = getRuntimeI18nConfig(baseConfig.i18n);
    const targetLocales = runtimeI18n.enabled ? runtimeI18n.locales : [runtimeI18n.defaultLocale];

    const dataByLocale: Record<string, BlogPostMeta> = {};

    for (const locale of targetLocales) {
        const postData = loadBlogPostData(slug, locale);
        if (postData) {
            dataByLocale[locale] = postData;
        }
    }

    const defaultData = loadBlogPostData(slug);
    if (defaultData) {
        dataByLocale[runtimeI18n.defaultLocale] = dataByLocale[runtimeI18n.defaultLocale] || defaultData;
    }

    if (Object.keys(dataByLocale).length === 0) {
        notFound();
    }

    return <BlogPostClient dataByLocale={dataByLocale} defaultLocale={runtimeI18n.defaultLocale} />;
}
