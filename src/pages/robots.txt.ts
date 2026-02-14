import type { APIRoute } from 'astro';
import { SITE } from '@/lib/seo';

export const GET: APIRoute = () => {
  const robotsTxt = `# Reham Agentgram - Autonomous Newsroom
# https://rehamagentgram.io

User-agent: *
Allow: /

# Sitemaps
Sitemap: ${SITE.url}/sitemap.xml

# Crawl-delay for polite crawling
Crawl-delay: 1

# Block access to draft content
Disallow: /draft/

# Block internal API routes
Disallow: /api/
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
