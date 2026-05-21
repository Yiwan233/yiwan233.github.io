export interface BasePageConfig {
    type: 'about' | 'publication' | 'card' | 'text' | 'blog' | 'contact' | 'gallery';
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

export interface GalleryItem {
    title: string;
    slug: string;
    date?: string;
    country?: string;
    location?: string;
    lat?: number;
    lng?: number;
    camera?: string;
    lens?: string;
    aperture?: string;
    shutter?: string;
    iso?: string;
    focal_length?: string;
    image: string;
    content?: string;
}

export interface GalleryLocationGroup {
    lat: number;
    lng: number;
    locationName: string;
    items: GalleryItem[];
}

export interface GalleryPageConfig extends BasePageConfig {
    type: 'gallery';
    items: GalleryItem[];
}

export interface GalleryPhoto {
    slug: string;
    title: string;
    date: string;
    location: string;
    lat?: number;
    lng?: number;
    camera: string;
    lens: string;
    aperture: string;
    shutter: string;
    iso: string;
    focal_length: string;
    image: string;
    content: string;
}
