import fs from 'fs';
import path from 'path';
import { parse } from 'smol-toml';

const DEFAULT_CONTENT_DIR = 'content';

function normalizeLocale(locale: string): string {
  return locale.trim().replace('_', '-').toLowerCase();
}

function getCandidateFilePaths(filename: string, locale?: string): string[] {
  const candidates: string[] = [];

  if (locale) {
    candidates.push(path.join(process.cwd(), `${DEFAULT_CONTENT_DIR}_${normalizeLocale(locale)}`, filename));
  }

  candidates.push(path.join(process.cwd(), DEFAULT_CONTENT_DIR, filename));

  return candidates;
}

function readFirstAvailableFile(filename: string, locale?: string): string {
  const candidates = getCandidateFilePaths(filename, locale);

  for (const filePath of candidates) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Error loading file ${filePath}:`, error);
      }
    }
  }

  if (locale) {
    console.warn(`Missing localized file \"${filename}\" for locale \"${locale}\", and no fallback found in content/.`);
  } else {
    console.warn(`Missing file \"${filename}\" in content/.`);
  }

  return '';
}

export function getMarkdownContent(filename: string, locale?: string): string {
  return readFirstAvailableFile(filename, locale);
}

export function getBibtexContent(filename: string, locale?: string): string {
  return readFirstAvailableFile(filename, locale);
}

export function getTomlContent<T>(filename: string, locale?: string): T | null {
  const content = readFirstAvailableFile(filename, locale);
  if (!content) {
    return null;
  }

  try {
    return parse(content) as unknown as T;
  } catch (error) {
    console.error(`Error parsing TOML file ${filename}:`, error);
    return null;
  }
}

export function getPageConfig<T = unknown>(pageName: string, locale?: string): T | null {
  return getTomlContent<T>(`${pageName}.toml`, locale);
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  summary: string;
  content: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };

  const metaBlock = match[1];
  const body = match[2];
  const meta: Record<string, string> = {};

  for (const line of metaBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
  }

  return { meta, body };
}

function parseTags(raw: string): string[] {
  // Parse tags from format like '["Tag1", "Tag2"]' or just 'Tag1, Tag2'
  const arrayMatch = raw.match(/^\[(.*)\]$/);
  if (arrayMatch) {
    return arrayMatch[1]
      .split(',')
      .map((t) => t.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }
  return raw.split(',').map((t) => t.trim()).filter(Boolean);
}

export function getBlogPosts(sourceDir: string, locale?: string): BlogPostMeta[] {
  const candidates = getCandidateFilePaths(sourceDir, locale);
  const defaultDir = path.join(process.cwd(), DEFAULT_CONTENT_DIR, sourceDir);

  let dirToRead = defaultDir;
  for (const candidate of candidates) {
    try {
      if (fs.statSync(candidate).isDirectory()) {
        dirToRead = candidate;
        break;
      }
    } catch {
      // continue
    }
  }

  try {
    const files = fs.readdirSync(dirToRead).filter((f) => f.endsWith('.md'));
    const posts: BlogPostMeta[] = [];

    for (const file of files) {
      const raw = fs.readFileSync(path.join(dirToRead, file), 'utf-8');
      const { meta, body } = parseFrontmatter(raw);
      const slug = file.replace(/\.md$/, '');

      posts.push({
        slug,
        title: meta.title || slug,
        date: meta.date || '',
        tags: meta.tags ? parseTags(meta.tags) : [],
        summary: meta.summary || '',
        content: body,
      });
    }

    // Sort by date descending
    posts.sort((a, b) => b.date.localeCompare(a.date));
    return posts;
  } catch {
    return [];
  }
}

export function getBlogPost(sourceDir: string, slug: string, locale?: string): BlogPostMeta | null {
  const candidates = getCandidateFilePaths(path.join(sourceDir, `${slug}.md`), locale);

  for (const filePath of candidates) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { meta, body } = parseFrontmatter(raw);
      return {
        slug,
        title: meta.title || slug,
        date: meta.date || '',
        tags: meta.tags ? parseTags(meta.tags) : [],
        summary: meta.summary || '',
        content: body,
      };
    } catch {
      // continue
    }
  }

  return null;
}
