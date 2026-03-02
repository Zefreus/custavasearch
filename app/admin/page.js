'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, ArrowLeft, Package, FileText, Store, Search, Eye, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#e9d5ff'];

export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState(null);
  const [searchLogs, setSearchLogs] = useState(null);
  const [productLogs, setProductLogs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndFetch();
  }, []);

  const checkAuthAndFetch = async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      
      if (!authData.user || !authData.user.isAdmin) {
        router.push('/');
        return;
      }

      await Promise.all([
        fetchMetrics(),
        fetchSearchLogs(),
        fetchProductLogs()
      ]);
    } catch (error) {
      console.error('Error:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const fetchSearchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs/searches?days=30');
      if (res.ok) {
        const data = await res.json();
        setSearchLogs(data);
      }
    } catch (error) {
      console.error('Error fetching search logs:', error);
    }
  };

  const fetchProductLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs/products?days=30');
      if (res.ok) {
        const data = await res.json();
        setProductLogs(data);
      }
    } catch (error) {
      console.error('Error fetching product logs:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
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
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Painel Administrativo</h1>
          <p className="text-gray-600">Relatórios e análises do sistema</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Produtos</h3>
            <p className="text-3xl font-bold text-gray-900">
              {metrics?.totalProducts?.toLocaleString('pt-BR') || 0}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Notas Fiscais</h3>
            <p className="text-3xl font-bold text-gray-900">
              {metrics?.totalInvoices?.toLocaleString('pt-BR') || 0}
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Lojas</h3>
            <p className="text-3xl font-bold text-gray-900">
              {metrics?.totalStores?.toLocaleString('pt-BR') || 0}
            </p>
          </Card>
        </div>

        {/* Tabs for Logs */}
        <Tabs defaultValue="searches" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="searches" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Logs de Busca
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Acessos a Produtos
            </TabsTrigger>
          </TabsList>

          {/* Search Logs Tab */}
          <TabsContent value="searches" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Buscas</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {searchLogs?.totalSearches?.total?.toLocaleString('pt-BR') || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Últimos 30 dias</p>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Termos Únicos</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {searchLogs?.totalSearches?.unique_terms?.toLocaleString('pt-BR') || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Termos diferentes buscados</p>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Usuários Ativos</h3>
                <p className="text-3xl font-bold text-green-600">
                  {searchLogs?.totalSearches?.unique_users?.toLocaleString('pt-BR') || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Usuários que buscaram</p>
              </Card>
            </div>

            {/* Search Chart */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Buscas por Dia
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={searchLogs?.searchesByDay?.reverse() || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#9333ea"
                    strokeWidth={2}
                    dot={{ fill: '#9333ea', r: 4 }}
                    name="Buscas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Top Searches */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Termos Mais Buscados</h2>
              <div className="space-y-3">
                {searchLogs?.topSearches?.slice(0, 10).map((search, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{search.search_term}</p>
                        <p className="text-sm text-gray-500">
                          {search.count} buscas • {search.total_results} resultados
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(search.last_search)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Product Access Logs Tab */}
          <TabsContent value="products" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Total de Acessos</h3>
                <p className="text-3xl font-bold text-purple-600">
                  {productLogs?.totalAccess?.total?.toLocaleString('pt-BR') || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Últimos 30 dias</p>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Produtos Visualizados</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {productLogs?.totalAccess?.unique_products?.toLocaleString('pt-BR') || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Produtos diferentes</p>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Visitantes Únicos</h3>
                <p className="text-3xl font-bold text-green-600">
                  {productLogs?.totalAccess?.unique_users?.toLocaleString('pt-BR') || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Usuários diferentes</p>
              </Card>
            </div>

            {/* Access Chart */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Acessos por Dia
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productLogs?.accessByDay?.reverse() || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                  />
                  <Bar
                    dataKey="count"
                    fill="#9333ea"
                    radius={[8, 8, 0, 0]}
                    name="Acessos"
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Top Products */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Produtos Mais Acessados</h2>
              <div className="space-y-3">
                {productLogs?.topProducts?.slice(0, 10).map((product, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.product_name}</p>
                        <p className="text-sm text-gray-500">
                          {product.access_count} acessos • {product.unique_visitors} visitantes únicos
                        </p>
                      </div>
                    </div>
                    <Link href={`/produto/${product.product_slug}`}>
                      <Button variant="outline" size="sm">
                        Ver
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
