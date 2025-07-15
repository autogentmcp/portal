import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: any): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '7d' })
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!)
  } catch {
    return null
  }
}

export async function getUserFromToken(token: string) {
  try {
    const decoded = verifyToken(token)
    if (!decoded?.userId) return null
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true }
    })
    
    return user
  } catch {
    return null
  }
}

export async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ||
                request.cookies.get('auth-token')?.value
  
  if (!token) return null
  
  return getUserFromToken(token)
}

export async function validateApiKey(apiKey: string) {
  try {
    const key = await prisma.apiKey.findFirst({
      where: {
        token: apiKey,
        status: 'ACTIVE',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        application: true,
        environment: true,
        user: { select: { id: true, email: true, name: true } }
      }
    })
    
    if (key) {
      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsed: new Date() }
      })
    }
    
    return key
  } catch {
    return null
  }
}
