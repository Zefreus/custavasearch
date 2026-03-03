'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, Store, Package, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function LojaPage() {
  const router = useRouter();
  const params = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchStore();
  }, [params.slug, page]);

  const fetchStore = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/store/${params.slug}?page=${page}`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao carregar loja');
      }
      
      const data = await res.json();
      setStore(data);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching store:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/">
            <Button>Voltar para o início</Button>
          </Link>
        </Card>
      </div>
    );
  }

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
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Store Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
              <Store className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{store?.name}</h1>
              <div className="flex flex-wrap gap-4 text-gray-600">
                {store?.uf && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {store.uf}
                  </span>
                )}
                {store?.address && (
                  <span className="text-sm">{store.address}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-sm text-gray-500 mb-2">Total de Produtos</p>
            <p className="text-3xl font-bold text-purple-600">{store?.totalProducts || 0}</p>
          </Card>
          
          <Card className="p-6">
            <p className="text-sm text-gray-500 mb-2">Total de Ocorrências</p>
            <p className="text-3xl font-bold text-blue-600">{store?.totalOccurrences || 0}</p>
          </Card>
          
          <Card className="p-6">
            <p className="text-sm text-gray-500 mb-2">Última Compra</p>
            <p className="text-xl font-bold text-gray-900">
              {store?.lastDate ? formatDate(store.lastDate) : 'N/A'}
            </p>
          </Card>
        </div>

        {/* Products Table */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-600" />
            Produtos Vendidos nesta Loja
          </h2>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="pb-3 text-sm font-semibold text-gray-600">Produto</th>
                      <th className="pb-3 text-sm font-semibold text-gray-600">Último Preço</th>
                      <th className="pb-3 text-sm font-semibold text-gray-600">Melhor Preço</th>
                      <th className="pb-3 text-sm font-semibold text-gray-600">Ocorrências</th>
                      <th className="pb-3 text-sm font-semibold text-gray-600">Última Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {store?.products?.map((product, index) => (
                      <tr key={index} className="border-b last:border-b-0 hover:bg-purple-50 transition-colors">
                        <td className="py-3">
                          <Link 
                            href={`/produto/${product.slug}`}
                            className="text-purple-600 hover:underline font-medium"
                          >
                            {product.name}
                          </Link>
                        </td>
                        <td className="py-3 text-sm font-semibold text-gray-900">
                          {formatPrice(product.lastPrice)}
                        </td>
                        <td className="py-3 text-sm font-semibold text-green-600">
                          {formatPrice(product.bestPrice)}
                        </td>
                        <td className="py-3 text-sm text-gray-600">
                          {product.occurrences}x
                        </td>
                        <td className="py-3 text-sm text-gray-500">
                          {formatDate(product.lastDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
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
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
