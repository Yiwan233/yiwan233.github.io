export interface BasePageConfig {
    type: 'about' | 'publication' | 'card' | 'text' | 'blog' | 'contact';
    title: string;
    description?: string;
}

export interface PublicationPageConfig extends BasePageConfig {
    type: 'publication';
    source: string;
}

export interface TextPageConfig extends BasePageConfig {
    type: 'text';
    source: string;
}

export interface CardItem {
    title: string;
    subtitle?: string;
    date?: string;
    content?: string;
    tags?: string[];
    link?: string;
    image?: string;
}

export interface CardPageConfig extends BasePageConfig {
    type: 'card';
    items: CardItem[];
}

export interface BlogPost {
    slug: string;
    title: string;
    date: string;
    tags: string[];
    summary: string;
    content: string;
}

export interface BlogPageConfig extends BasePageConfig {
    type: 'blog';
    source: string;
}

export interface ContactPageConfig extends BasePageConfig {
    type: 'contact';
    form_endpoint?: string;
}
