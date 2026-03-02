export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://custavasearch.vercel.app';
  
  // Páginas estáticas
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/buscar', priority: '0.8', changefreq: 'daily' },
    { url: '/cadastro', priority: '0.6', changefreq: 'monthly' },
    { url: '/login', priority: '0.5', changefreq: 'monthly' }
  ];

  const today = new Date().toISOString().split('T')[0];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${staticPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}
