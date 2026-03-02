'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function TestAuthPage() {
  const [email, setEmail] = useState('zefreus@gmail.com');
  const [password, setPassword] = useState('tricolor83');
  const [result, setResult] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');

  const testLogin = async () => {
    setResult('Testando login...');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // IMPORTANTE!
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      
      // Verificar headers da resposta
      const headers = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      setResult(JSON.stringify({
        status: res.status,
        data,
        headers
      }, null, 2));
      
      // Tentar verificar sessão imediatamente
      setTimeout(async () => {
        const sessionRes = await fetch('/api/auth/me', {
          credentials: 'include' // IMPORTANTE!
        });
        const sessionData = await sessionRes.json();
        setSessionInfo(JSON.stringify(sessionData, null, 2));
      }, 500);
      
    } catch (error) {
      setResult('Erro: ' + error.message);
    }
  };

  const testSession = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include' // IMPORTANTE!
      });
      const data = await res.json();
      setSessionInfo(JSON.stringify(data, null, 2));
    } catch (error) {
      setSessionInfo('Erro: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Teste de Autenticação</h1>
        
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Login</h2>
          <div className="space-y-4">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
            />
            <Button onClick={testLogin} className="w-full">
              Testar Login
            </Button>
          </div>
          
          {result && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Resultado do Login:</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                {result}
              </pre>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Verificar Sessão</h2>
          <Button onClick={testSession} className="w-full">
            Testar Sessão
          </Button>
          
          {sessionInfo && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Info da Sessão:</h3>
              <pre className="bg-gray-100 p-4 rounded text-xs">
                {sessionInfo}
              </pre>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Cookies do Navegador</h2>
          <p className="text-sm text-gray-600 mb-2">
            Abra o DevTools (F12) → Application → Cookies → localhost:3000
          </p>
          <p className="text-sm text-gray-600">
            Você deve ver um cookie chamado "session" após o login.
          </p>
        </Card>

        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-xl font-semibold mb-4">⚠️ Importante</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Certifique-se de que está usando <code className="bg-yellow-100 px-1">credentials: 'include'</code> em todos os fetches</li>
            <li>Verifique se o cookie aparece no DevTools após o login</li>
            <li>O cookie deve ter: HttpOnly=true, Path=/, SameSite=Lax</li>
            <li>Se o cookie não aparecer, pode ser problema de configuração do navegador</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
