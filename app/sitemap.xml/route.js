import { query } from '@/lib/db';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://custavasearch.vercel.app';
  
  // Páginas estáticas
  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'daily' },
    { url: '/buscar', priority: '0.8', changefreq: 'daily' }
  ];

  // Buscar lojas únicas do banco de dados
  let storePages = [];
  try {
    const stores = await query(`
      SELECT DISTINCT CNPJ, Local 
      FROM APP_NOTA_FISCAL 
      WHERE CNPJ IS NOT NULL AND CNPJ != ''
      LIMIT 100
    `);
    
    storePages = stores.map(store => ({
      url: `/loja/${store.CNPJ}`,
      priority: '0.6',
      changefreq: 'weekly'
    }));
  } catch (error) {
    console.error('Error fetching stores for sitemap:', error);
  }

  const allPages = [...staticPages, ...storePages];
  const today = new Date().toISOString().split('T')[0];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allPages.map(page => `  <url>
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
