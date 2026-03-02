export const siteConfig = {
  name: "Custava Search",
  description: "Portal de busca de preços baseado em notas fiscais eletrônicas. Compare preços, veja histórico e encontre as melhores ofertas.",
  url: process.env.NEXT_PUBLIC_BASE_URL || "https://custavasearch.vercel.app",
  ogImage: `${process.env.NEXT_PUBLIC_BASE_URL || "https://custavasearch.vercel.app"}/og-image.jpg`,
  keywords: [
    "busca de preços",
    "comparador de preços",
    "nota fiscal eletrônica",
    "NF-e",
    "preços de produtos",
    "histórico de preços",
    "melhor preço",
    "comparação de preços",
    "economia",
    "supermercado",
    "varejo"
  ],
  authors: [
    {
      name: "Zefreus",
      url: "https://github.com/Zefreus"
    }
  ],
  creator: "Zefreus",
  publisher: "Custava Search",
  locale: "pt_BR",
  type: "website"
};

export const generateMetadata = ({
  title,
  description,
  image,
  canonical,
  noindex = false,
  keywords = []
}) => {
  const pageTitle = title ? `${title} | ${siteConfig.name}` : siteConfig.name;
  const pageDescription = description || siteConfig.description;
  const pageImage = image || siteConfig.ogImage;
  const pageUrl = canonical || siteConfig.url;
  const allKeywords = [...siteConfig.keywords, ...keywords].join(", ");

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: allKeywords,
    authors: siteConfig.authors,
    creator: siteConfig.creator,
    publisher: siteConfig.publisher,
    robots: noindex ? "noindex, nofollow" : "index, follow",
    alternates: {
      canonical: pageUrl
    },
    openGraph: {
      type: siteConfig.type,
      locale: siteConfig.locale,
      url: pageUrl,
      title: pageTitle,
      description: pageDescription,
      siteName: siteConfig.name,
      images: [
        {
          url: pageImage,
          width: 1200,
          height: 630,
          alt: pageTitle
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [pageImage],
      creator: "@zefreus"
    },
    other: {
      "google-site-verification": "seu-codigo-aqui",
      "og:phone_number": "",
      "og:email": "",
      "og:latitude": "",
      "og:longitude": "",
      "og:street-address": "",
      "og:locality": "Brasil",
      "og:region": "BR",
      "og:postal-code": "",
      "og:country-name": "Brasil"
    }
  };
};

export const generateJsonLd = (type, data) => {
  const baseData = {
    "@context": "https://schema.org",
    "@type": type
  };

  return {
    ...baseData,
    ...data
  };
};
