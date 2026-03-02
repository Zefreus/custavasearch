'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, TrendingUp, ArrowLeft, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';

function BuscarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState({ uf: '', loja: '', sort: 'recent' });
  const [availableFilters, setAvailableFilters] = useState({ ufs: [], stores: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchFilters();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      searchProducts(q, page, filters);
    }
  }, [searchParams, page]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchFilters = async () => {
    try {
      const res = await fetch('/api/filters');
      const data = await res.json();
      setAvailableFilters(data);
    } catch (error) {
      console.error('Error fetching filters:', error);
    }
  };

  const searchProducts = async (q, p, f) => {
    if (!q) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        page: p.toString(),
        sort: f.sort
      });
      if (f.uf) params.append('uf', f.uf);
      if (f.loja) params.append('loja', f.loja);

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setPage(1);
      router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleFilterChange = (key, value) => {
    // Converter valores especiais para string vazia
    const actualValue = (value === 'all' || value === 'todos') ? '' : value;
    const newFilters = { ...filters, [key]: actualValue };
    setFilters(newFilters);
    setPage(1);
    searchProducts(query, 1, newFilters);
  };

  const clearFilters = () => {
    setFilters({ uf: '', loja: '', sort: 'recent' });
    setPage(1);
    searchProducts(query, 1, { uf: '', loja: '', sort: 'recent' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
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
            <div className="flex items-center gap-2">
              {user?.isAdmin && (
                <Link href="/admin">
                  <Button variant="default" size="sm" className="bg-gradient-to-r from-purple-600 to-purple-700">
                    Admin
                  </Button>
                </Link>
              )}
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative max-w-3xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar produto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 pr-32 py-6 text-lg rounded-xl border-2 border-purple-200 focus:border-purple-500"
            />
            <Button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-600 to-purple-700"
            >
              Buscar
            </Button>
          </div>
        </form>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:w-64 shrink-0">
            <Card className="p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                </h3>
                {(filters.uf || filters.loja) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Ordenar por</label>
                  <Select value={filters.sort} onValueChange={(v) => handleFilterChange('sort', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Mais recente</SelectItem>
                      <SelectItem value="price_asc">Menor preço</SelectItem>
                      <SelectItem value="price_desc">Maior preço</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Estado (UF)</label>
                  <Select value={filters.uf || 'todos'} onValueChange={(v) => handleFilterChange('uf', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {availableFilters.ufs.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Loja</label>
                  <Select value={filters.loja || 'todas'} onValueChange={(v) => handleFilterChange('loja', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {availableFilters.stores.slice(0, 20).map((store) => (
                        <SelectItem key={store} value={store}>{store}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          </aside>

          {/* Results */}
          <main className="flex-1">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
              </div>
            ) : products.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-600">Nenhum produto encontrado</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Card key={product.slug} className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-500">Melhor preço</p>
                            <p className="text-lg font-bold text-green-600">{formatPrice(product.bestPrice)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Último preço</p>
                            <p className="text-lg font-semibold text-gray-900">{formatPrice(product.lastPrice)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Variação</p>
                            <p className={`text-lg font-semibold ${product.variation >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {product.variation >= 0 ? '+' : ''}{product.variation.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Ocorrências</p>
                            <p className="text-lg font-semibold text-gray-900">{product.occurrences}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">Atualizado em: {formatDate(product.lastDate)}</p>
                      </div>
                      <div>
                        {user ? (
                          <Link href={`/produto/${product.slug}`}>
                            <Button className="bg-gradient-to-r from-purple-600 to-purple-700">
                              Ver detalhes
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/login?returnUrl=/produto/${product.slug}`}>
                            <Button className="bg-gradient-to-r from-purple-600 to-purple-700">
                              Ver detalhes
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="px-4 py-2 text-sm text-gray-600">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
