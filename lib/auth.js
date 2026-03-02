import crypto from 'crypto';
import { query, queryOne } from './db';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'custava-search-secret-key'
);

export function hashMD5(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

export async function authenticateUser(email, password) {
  const hashedPassword = hashMD5(password);
  
  const user = await queryOne(
    `SELECT id, TX_EMAIL, TX_NOME, IS_ATIVO, UserID, IsAdmin 
     FROM zefreus.CON_API_USER 
     WHERE TX_EMAIL = ? AND TX_SENHA = ? AND IS_ATIVO = true`,
    [email, hashedPassword]
  );
  
  if (!user) {
    return null;
  }
  
  return {
    userID: user.UserID,
    name: user.TX_NOME,
    email: user.TX_EMAIL,
    isAdmin: user.IsAdmin === 1 || user.IsAdmin === true
  };
}

export async function createSession(user) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
  
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  });
  
  return token;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (error) {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

export function requireAuth(handler) {
  return async (request, context) => {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Não autorizado' }, { status: 401 });
    }
    return handler(request, { ...context, session });
  };
}

export function requireAdmin(handler) {
  return async (request, context) => {
    const session = await getSession();
    if (!session || !session.isAdmin) {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }
    return handler(request, { ...context, session });
  };
}
