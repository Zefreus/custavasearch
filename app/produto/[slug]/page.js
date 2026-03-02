'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  useEffect(() => {
    checkAuthAndFetch();
  }, [params.slug]);

  useEffect(() => {
    if (product) {
      fetchHistory(historyPage);
    }
  }, [historyPage]);

  const checkAuthAndFetch = async () => {
    try {
      const authRes = await fetch('/api/auth/me', {
        credentials: 'include' // Garantir que cookies sejam enviados
      });
      const authData = await authRes.json();
      
      if (!authData.user) {
        router.push(`/login?returnUrl=/produto/${params.slug}`);
        return;
      }

      await fetchProduct();
      await fetchHistory(1);
    } catch (error) {
      console.error('Error:', error);
      router.push('/login');
    }
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/product/${params.slug}`);
      if (res.status === 401) {
        router.push(`/login?returnUrl=/produto/${params.slug}`);
        return;
      }
      const data = await res.json();
      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (page) => {
    try {
      const res = await fetch(`/api/product/${params.slug}/history?page=${page}`);
      if (res.status === 401) {
        router.push(`/login?returnUrl=/produto/${params.slug}`);
        return;
      }
      const data = await res.json();
      setHistory(data.history || []);
      setHistoryTotal(data.totalPages || 0);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Produto não encontrado</p>
          <Link href="/">
            <Button>Voltar</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const chartData = product.trend?.map(t => ({
    date: formatDate(t.date),
    price: t.price
  })).reverse() || [];

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
        {/* Product Header */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-600">{product.occurrences} ocorrências encontradas</p>
            </div>
          </div>
        </div>

        {/* Price Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <p className="text-sm text-gray-500 mb-2">Melhor Preço</p>
            <p className="text-3xl font-bold text-green-600">{formatPrice(product.bestPrice)}</p>
          </Card>
          
          <Card className="p-6">
            <p className="text-sm text-gray-500 mb-2">Último Preço</p>
            <p className="text-3xl font-bold text-gray-900">{formatPrice(product.lastPrice)}</p>
          </Card>
          
          <Card className="p-6">
            <p className="text-sm text-gray-500 mb-2">Preço Médio</p>
            <p className="text-3xl font-bold text-blue-600">{formatPrice(product.avgPrice)}</p>
          </Card>
          
          <Card className="p-6">
            <p className="text-sm text-gray-500 mb-2">Variação</p>
            <div className="flex items-center gap-2">
              {product.variation >= 0 ? (
                <TrendingUp className="w-6 h-6 text-red-600" />
              ) : (
                <TrendingDown className="w-6 h-6 text-green-600" />
              )}
              <p className={`text-3xl font-bold ${product.variation >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {product.variation >= 0 ? '+' : ''}{product.variation.toFixed(1)}%
              </p>
            </div>
          </Card>
        </div>

        {/* Price Chart */}
        {chartData.length > 0 && (
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Histórico de Preços</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => formatPrice(value)}
                />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={{ fill: '#9333ea', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* History Table */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Todas as Ocorrências</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 text-sm font-semibold text-gray-600">Data</th>
                  <th className="pb-3 text-sm font-semibold text-gray-600">Preço</th>
                  <th className="pb-3 text-sm font-semibold text-gray-600">Qtd</th>
                  <th className="pb-3 text-sm font-semibold text-gray-600">Unidade</th>
                  <th className="pb-3 text-sm font-semibold text-gray-600">Loja</th>
                  <th className="pb-3 text-sm font-semibold text-gray-600">UF</th>
                  <th className="pb-3 text-sm font-semibold text-gray-600">CNPJ</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, index) => (
                  <tr key={index} className="border-b last:border-b-0 hover:bg-purple-50 transition-colors">
                    <td className="py-3 text-sm">{formatDate(item.date)}</td>
                    <td className="py-3 text-sm font-semibold text-green-600">{formatPrice(item.price)}</td>
                    <td className="py-3 text-sm">{item.quantity}</td>
                    <td className="py-3 text-sm">{item.unit}</td>
                    <td className="py-3 text-sm">
                      <Link href={`/loja/${item.cnpj}`} className="text-purple-600 hover:underline">
                        {item.store}
                      </Link>
                    </td>
                    <td className="py-3 text-sm">{item.uf}</td>
                    <td className="py-3 text-sm font-mono text-xs">{item.cnpj}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {historyTotal > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={historyPage === 1}
                onClick={() => setHistoryPage(historyPage - 1)}
              >
                Anterior
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Página {historyPage} de {historyTotal}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={historyPage === historyTotal}
                onClick={() => setHistoryPage(historyPage + 1)}
              >
                Próxima
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
