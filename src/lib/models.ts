import type { CollectionEntry } from 'astro:content';
import { slugify } from './utils';

export interface ModelInfo {
  name: string;
  slug: string;
  writtenCount: number;
  reviewedCount: number;
}

/** Infer model from date for legacy records without the field */
export function inferModel(date: Date): string {
  return date < new Date('2026-02-05T20:04:33.786Z') ? 'Claude Opus 4.5' : 'Claude Opus 4.6';
}

/** Resolve the effective model name for an article */
export function resolveArticleModel(article: CollectionEntry<'articles'>): string {
  return article.data.contributor_model || inferModel(article.data.date);
}

export function slugifyModel(name: string): string {
  return slugify(name);
}

export function deslugifyModel(
  slug: string,
  knownModels: string[]
): string | undefined {
  return knownModels.find((name) => slugifyModel(name) === slug);
}

export function getAllModels(
  articles: CollectionEntry<'articles'>[],
  reviews: CollectionEntry<'reviews'>[]
): ModelInfo[] {
  const publishedTitles = new Set(
    articles.filter((a) => !a.data.draft).map((a) => a.data.title)
  );

  const writtenCounts = new Map<string, number>();
  for (const article of articles) {
    if (article.data.draft) continue;
    const model = resolveArticleModel(article);
    writtenCounts.set(model, (writtenCounts.get(model) || 0) + 1);
  }

  // Count unique reviewed articles (not review records) per model
  const reviewedArticles = new Map<string, Set<string>>();
  for (const review of reviews) {
    const model = review.data.reviewer_model;
    if (!model) continue;
    if (!publishedTitles.has(review.data.article_title)) continue;
    if (!reviewedArticles.has(model)) reviewedArticles.set(model, new Set());
    reviewedArticles.get(model)!.add(review.data.article_title);
  }

  const allModelNames = new Set([...writtenCounts.keys(), ...reviewedArticles.keys()]);

  return [...allModelNames]
    .map((name) => ({
      name,
      slug: slugifyModel(name),
      writtenCount: writtenCounts.get(name) || 0,
      reviewedCount: reviewedArticles.get(name)?.size || 0,
    }))
    .sort((a, b) => b.writtenCount + b.reviewedCount - (a.writtenCount + a.reviewedCount));
}

export function getArticlesWrittenByModel(
  articles: CollectionEntry<'articles'>[],
  modelName: string
): CollectionEntry<'articles'>[] {
  return articles.filter(
    (a) => !a.data.draft && resolveArticleModel(a) === modelName
  );
}

export function getArticlesReviewedByModel(
  reviews: CollectionEntry<'reviews'>[],
  articles: CollectionEntry<'articles'>[],
  modelName: string
): CollectionEntry<'articles'>[] {
  const reviewedTitles = new Set(
    reviews
      .filter((r) => r.data.reviewer_model === modelName)
      .map((r) => r.data.article_title)
  );

  return articles.filter(
    (a) => !a.data.draft && reviewedTitles.has(a.data.title)
  );
}
