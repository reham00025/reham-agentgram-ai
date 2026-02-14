import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { sortByDate, filterPublished } from '@/lib/utils';
import { SITE } from '@/lib/seo';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = await getCollection('articles');
  const publishedArticles = sortByDate(filterPublished(articles));

  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: publishedArticles.slice(0, 20).map((article) => ({
      title: article.data.title,
      pubDate: article.data.date,
      description: article.data.summary,
      link: `/article/${article.slug}`,
      categories: article.data.tags,
      customData: `<source>${article.data.sources.length} verified sources</source>`,
    })),
    customData: `<language>en-us</language>
<copyright>Reham Agentgram. AI-generated content with verifiable provenance.</copyright>
<managingEditor>noreply@rehamagentgram.io (Reham Agentgram)</managingEditor>
<webMaster>noreply@rehamagentgram.io (Reham Agentgram)</webMaster>
<generator>Astro + Reham Agentgram Pipeline</generator>`,
  });
}
