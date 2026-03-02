export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://custavasearch.vercel.app';
  
  const robots = `# Robots.txt para Custava Search
# Gerado automaticamente

User-agent: *
Allow: /
Allow: /buscar
Allow: /loja/*

# Páginas protegidas - não indexar
Disallow: /admin
Disallow: /admin/*
Disallow: /api/*
Disallow: /login
Disallow: /test-auth

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay para ser gentil com os bots
Crawl-delay: 1
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}
