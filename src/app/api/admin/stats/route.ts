import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [
      totalApplications,
      activeApplications,
      totalUsers,
      totalApiKeys,
    ] = await Promise.all([
      prisma.application.count(),
      prisma.application.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.user.count(),
      prisma.apiKey.count({
        where: { status: 'ACTIVE' },
      }),
    ])

    const stats = {
      totalApplications,
      activeApplications,
      totalUsers,
      totalApiKeys,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
