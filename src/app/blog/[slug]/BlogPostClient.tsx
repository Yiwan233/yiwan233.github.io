'use client';

import { useLocaleStore } from '@/lib/stores/localeStore';
import BlogPost from '@/components/pages/BlogPost';
import type { BlogPostMeta } from '@/lib/content';

interface BlogPostClientProps {
    dataByLocale: Record<string, BlogPostMeta>;
    defaultLocale: string;
}

export default function BlogPostClient({ dataByLocale, defaultLocale }: BlogPostClientProps) {
    const locale = useLocaleStore((state) => state.locale);
    const fallback = dataByLocale[defaultLocale] || Object.values(dataByLocale)[0];
    const postData = dataByLocale[locale] || fallback;

    if (!postData) {
        return null;
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <BlogPost post={postData} />
        </div>
    );
}
