import jwt from 'jsonwebtoken';

// This interface defines the structure of the data stored inside the JWT
interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }

  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token.');
  }
}