import type { CollectionEntry } from 'astro:content';
import readingTime from 'reading-time';

// Pagination settings
export const ARTICLES_PER_PAGE = 12;

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export function getReadingTime(content: string): string {
  const result = readingTime(content);
  return result.text;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trim() + '...';
}

export function sortByDate<T extends { data: { date: Date } }>(
  items: T[],
  order: 'asc' | 'desc' = 'desc'
): T[] {
  return [...items].sort((a, b) => {
    const diff = b.data.date.getTime() - a.data.date.getTime();
    return order === 'desc' ? diff : -diff;
  });
}

export function filterByCategory<
  T extends { data: { category: string; draft?: boolean } },
>(items: T[], category: string): T[] {
  return items.filter(
    (item) => item.data.category === category && !item.data.draft
  );
}

export function filterPublished<T extends { data: { draft?: boolean } }>(
  items: T[]
): T[] {
  return items.filter((item) => !item.data.draft);
}

export function getAllSignals(
  articles: CollectionEntry<'articles'>[]
): Map<string, number> {
  const tagCount = new Map<string, number>();

  for (const article of articles) {
    if (article.data.draft) continue;
    for (const tag of article.data.tags) {
      tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
  }

  return new Map([...tagCount.entries()].sort((a, b) => b[1] - a[1]));
}

export function getTopSources(
  articles: CollectionEntry<'articles'>[],
  limit = 5
): { domain: string; count: number }[] {
  const sourceCount = new Map<string, number>();

  for (const article of articles) {
    if (article.data.draft) continue;
    for (const source of article.data.sources) {
      try {
        const url = new URL(source);
        const domain = url.hostname.replace('www.', '');
        sourceCount.set(domain, (sourceCount.get(domain) || 0) + 1);
      } catch {
        // Skip invalid URLs
      }
    }
  }

  return [...sourceCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([domain, count]) => ({ domain, count }));
}

export function generateArticleSlug(title: string, date: Date): string {
  const datePrefix = formatDateISO(date);
  const titleSlug = slugify(title);
  return `${datePrefix}-${titleSlug}`;
}

export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}
