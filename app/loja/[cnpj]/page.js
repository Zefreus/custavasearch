'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, TrendingUp, Store, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function LojaPage() {
  const router = useRouter();
  const params = useParams();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchStore();
  }, [params.cnpj]);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchStore = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/store/${params.cnpj}`);
      const data = await res.json();
      setStore(data);
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Loja não encontrada</p>
          <Link href="/">
            <Button>Voltar</Button>
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
        <Card className="p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
              <Store className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{store.name}</h1>
              <div className="flex flex-wrap gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{store.uf}</span>
                </div>
                <div>
                  <span className="font-mono text-sm">CNPJ: {store.cnpj}</span>
                </div>
                <div>
                  <span>{store.invoiceCount} notas fiscais</span>
                </div>
              </div>
              {store.address && (
                <p className="text-gray-600 mt-2">{store.address}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Top Products */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Produtos Mais Comuns</h2>
          <div className="grid gap-4">
            {store.topProducts?.map((product) => (
              <Card key={product.slug} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Último preço: </span>
                        <span className="font-semibold text-green-600">{formatPrice(product.lastPrice)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Atualizado: </span>
                        <span className="text-gray-900">{formatDate(product.lastDate)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Ocorrências: </span>
                        <span className="text-gray-900">{product.occurrences}</span>
                      </div>
                    </div>
                  </div>
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
              </Card>
            ))}
          </div>
        </div>

        {/* CTA for Login */}
        {!user && (
          <Card className="p-8 text-center bg-gradient-to-br from-purple-50 to-white border-purple-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Quer ver mais informações?</h3>
            <p className="text-gray-600 mb-6">
              Faça login para acessar o histórico completo de preços e mais detalhes
            </p>
            <Link href="/login">
              <Button size="lg" className="bg-gradient-to-r from-purple-600 to-purple-700">
                Fazer Login
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
