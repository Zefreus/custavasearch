'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, Package, Store, ShieldCheck, BarChart3, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import Script from 'next/script';

// JSON-LD para SEO estruturado
const jsonLdWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Custava Search",
  "alternateName": "Custava - Buscador de Preços",
  "url": "https://custavasearch.vercel.app",
  "description": "Portal de busca de preços baseado em notas fiscais eletrônicas (NF-e). Compare preços de produtos, veja histórico completo e encontre as melhores ofertas do mercado brasileiro.",
  "inLanguage": "pt-BR",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://custavasearch.vercel.app/buscar?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Custava Search",
  "url": "https://custavasearch.vercel.app",
  "logo": "https://custavasearch.vercel.app/logo.png",
  "description": "Plataforma brasileira de comparação de preços baseada em dados reais de notas fiscais eletrônicas.",
  "sameAs": []
};

const jsonLdFAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "O que é o Custava Search?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "O Custava Search é um portal de busca de preços que utiliza dados de notas fiscais eletrônicas (NF-e) reais para permitir a comparação de preços de produtos em diferentes lojas e datas."
      }
    },
    {
      "@type": "Question",
      "name": "Como funcionam os preços do Custava?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Os preços exibidos no Custava são extraídos diretamente de notas fiscais eletrônicas oficiais, garantindo dados autênticos e verificáveis de transações reais realizadas em estabelecimentos comerciais."
      }
    },
    {
      "@type": "Question",
      "name": "O Custava Search é gratuito?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sim, a busca de produtos é 100% gratuita. Para acessar funcionalidades avançadas como histórico completo de preços e gráficos detalhados, é necessário criar uma conta gratuita."
      }
    },
    {
      "@type": "Question",
      "name": "Quais tipos de produtos posso pesquisar?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Você pode pesquisar qualquer produto que tenha sido registrado em notas fiscais eletrônicas, incluindo itens de supermercados, farmácias, lojas de eletrônicos e diversos estabelecimentos comerciais."
      }
    }
  ]
};

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [user, setUser] = useState(null);
  const [trending, setTrending] = useState([]);
  const debounceTimer = useRef(null);

  useEffect(() => {
    fetchUser();
    fetchTrending();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await fetch('/api/trending?days=7');
      const data = await res.json();
      setTrending(data.trending || []);
    } catch (error) {
      console.error('Error fetching trending:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (value.length >= 2) {
      debounceTimer.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/suggest?q=${encodeURIComponent(value)}`);
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      }, 400);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    router.push(`/buscar?q=${encodeURIComponent(suggestion)}`);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* JSON-LD Scripts para SEO */}
      <Script
        id="json-ld-website"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
      />
      <Script
        id="json-ld-organization"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
      />
      <Script
        id="json-ld-faq"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFAQ) }}
      />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-purple-100 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                Custava Search
              </span>
            </Link>
            <nav className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-sm text-gray-600">Olá, {user.name}</span>
                  {user.isAdmin && (
                    <Link href="/admin">
                      <Button variant="default" size="sm" className="bg-gradient-to-r from-purple-600 to-purple-700">
                        Admin
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Sair
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/cadastro">
                    <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-800">
                      Criar Conta
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="sm">Entrar</Button>
                  </Link>
                </>
              )}
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-purple-700 to-purple-900 bg-clip-text text-transparent">
              Encontre os Melhores Preços
            </h1>
            <p className="text-xl text-gray-600">
              Busque produtos e compare preços baseados em notas fiscais reais
            </p>
          </div>

          {/* Search Box */}
          <div className="relative">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar produto..."
                  value={query}
                  onChange={handleInputChange}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  className="pl-12 pr-4 py-6 text-lg rounded-2xl border-2 border-purple-200 focus:border-purple-500 shadow-lg"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl"
              >
                Buscar
              </Button>
            </form>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-xl border border-purple-100 overflow-hidden z-50">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      <span className="text-gray-800">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="container mx-auto px-4 py-16 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              O que é o Custava Search?
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-purple-600 to-purple-800 mx-auto mb-6"></div>
          </div>

          <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
            <p>
              O <strong className="text-purple-700">Custava Search</strong> é um portal inovador que permite você 
              <strong> comparar preços de produtos baseados em notas fiscais eletrônicas (NF-e) reais</strong>. 
              Diferente de outros comparadores, nossos dados vêm diretamente de transações oficiais registradas, 
              garantindo <strong>informações autênticas e confiáveis</strong>.
            </p>

            <div className="grid md:grid-cols-3 gap-6 my-8">
              <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100 text-center">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg text-purple-900 mb-2">Dados Verificados</h3>
                <p className="text-sm text-gray-600">Preços extraídos de NF-e oficiais do governo</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100 text-center">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg text-purple-900 mb-2">Histórico Completo</h3>
                <p className="text-sm text-gray-600">Acompanhe a variação de preços ao longo do tempo</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100 text-center">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-7 h-7 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg text-purple-900 mb-2">Lojas por Região</h3>
                <p className="text-sm text-gray-600">Compare preços em estabelecimentos próximos</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 my-8">
              <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
                <h3 className="font-semibold text-xl text-purple-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Como Funciona
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Busque qualquer produto do mercado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Veja preços reais de notas fiscais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Compare entre diferentes lojas e datas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Acesse histórico completo de variações</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-white p-6 rounded-xl border border-purple-100">
                <h3 className="font-semibold text-xl text-purple-900 mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Benefícios
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span><strong>100% gratuito</strong> para buscar produtos</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Dados baseados em <strong>NF-e oficiais</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Histórico completo de preços</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Identifique tendências e promoções</span>
                  </li>
                </ul>
              </div>
            </div>

            <p>
              Com o Custava Search, você tem acesso a <strong>milhares de registros de preços</strong> de 
              supermercados, lojas e estabelecimentos comerciais. Nossa plataforma analisa notas fiscais 
              para mostrar não apenas o preço atual, mas também o <strong>histórico de variações</strong>, 
              permitindo que você identifique o melhor momento para comprar e onde encontrar os melhores preços.
            </p>

            <div className="bg-purple-100 border-l-4 border-purple-600 p-6 rounded-r-xl">
              <p className="text-purple-900 font-medium">
                💡 <strong>Dica:</strong> Faça login para acessar gráficos detalhados, histórico completo de preços 
                e informações sobre onde cada produto foi vendido. Compare lojas, acompanhe tendências e economize 
                dinheiro com dados reais do mercado!
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <p className="text-gray-600 mb-4">Pronto para começar a economizar?</p>
            <div className="flex gap-4 justify-center">
              {!user && (
                <Link href="/cadastro">
                  <Button size="lg" className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
                    Criar Conta Grátis
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section para SEO */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
            <p className="text-gray-600">Tire suas dúvidas sobre o Custava Search</p>
          </div>

          <div className="space-y-4">
            <details className="bg-white rounded-xl border border-purple-100 overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-purple-50 transition-colors font-semibold text-gray-900 flex items-center justify-between">
                <span>O que é o Custava Search?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-6 pb-6 text-gray-700">
                O Custava Search é um portal de busca de preços que utiliza dados de notas fiscais eletrônicas (NF-e) reais 
                para permitir a comparação de preços de produtos em diferentes lojas e datas. Todos os preços são verificados 
                e vêm de transações reais registradas oficialmente.
              </div>
            </details>

            <details className="bg-white rounded-xl border border-purple-100 overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-purple-50 transition-colors font-semibold text-gray-900 flex items-center justify-between">
                <span>Como funcionam os preços do Custava?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-6 pb-6 text-gray-700">
                Os preços exibidos no Custava são extraídos diretamente de notas fiscais eletrônicas oficiais, garantindo 
                dados autênticos e verificáveis de transações reais realizadas em estabelecimentos comerciais de todo o Brasil.
              </div>
            </details>

            <details className="bg-white rounded-xl border border-purple-100 overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-purple-50 transition-colors font-semibold text-gray-900 flex items-center justify-between">
                <span>O Custava Search é gratuito?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-6 pb-6 text-gray-700">
                Sim, a busca de produtos é 100% gratuita! Qualquer pessoa pode pesquisar produtos sem criar uma conta. 
                Para acessar funcionalidades avançadas como histórico completo de preços, gráficos detalhados e comparação 
                entre lojas, basta criar uma conta gratuita.
              </div>
            </details>

            <details className="bg-white rounded-xl border border-purple-100 overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-purple-50 transition-colors font-semibold text-gray-900 flex items-center justify-between">
                <span>Quais tipos de produtos posso pesquisar?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-6 pb-6 text-gray-700">
                Você pode pesquisar qualquer produto que tenha sido registrado em notas fiscais eletrônicas, incluindo 
                itens de supermercados, farmácias, lojas de eletrônicos, materiais de construção e diversos outros 
                estabelecimentos comerciais em todo o Brasil.
              </div>
            </details>

            <details className="bg-white rounded-xl border border-purple-100 overflow-hidden group">
              <summary className="p-6 cursor-pointer hover:bg-purple-50 transition-colors font-semibold text-gray-900 flex items-center justify-between">
                <span>Como o Custava ajuda a economizar dinheiro?</span>
                <span className="text-purple-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-6 pb-6 text-gray-700">
                Com o histórico de preços, você pode identificar tendências e descobrir qual o melhor momento para comprar. 
                Além disso, comparando preços entre diferentes lojas, você encontra onde cada produto está mais barato na sua região.
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="p-6 hover:shadow-lg transition-shadow border-purple-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Histórico de Preços</h3>
            <p className="text-gray-600">
              Acompanhe a evolução dos preços ao longo do tempo com gráficos detalhados
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow border-purple-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Dados Reais</h3>
            <p className="text-gray-600">
              Informações baseadas em notas fiscais eletrônicas oficiais
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow border-purple-100">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Store className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Compare Lojas</h3>
            <p className="text-gray-600">
              Veja onde encontrar os melhores preços e promoções
            </p>
          </Card>
        </div>
      </section>

      {/* Trending Section */}
      {trending.length > 0 && (
        <section className="container mx-auto px-4 py-16 bg-white/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Produtos Mais Buscados
              </h2>
              <p className="text-gray-600">
                Veja o que as pessoas estão procurando esta semana
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {trending.slice(0, 10).map((item, index) => (
                <Card key={item.slug} className="p-4 hover:shadow-lg transition-shadow border-purple-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-purple-700">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{item.productName}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500">{item.searchCount} buscas</span>
                        <span className="text-sm text-gray-300">•</span>
                        <span className="text-lg font-bold text-green-600">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(item.lastPrice)}
                        </span>
                      </div>
                    </div>
                    {user ? (
                      <Link href={`/produto/${item.slug}`}>
                        <Button size="sm" variant="outline" className="flex-shrink-0">
                          Ver
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/login?returnUrl=/produto/${item.slug}`}>
                        <Button size="sm" variant="outline" className="flex-shrink-0">
                          Ver
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-purple-100 mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>© 2025 Custava Search. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
