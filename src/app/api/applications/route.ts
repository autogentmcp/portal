import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const applications = await prisma.application.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        description: true,
        appKey: true,
        createdAt: true,
        updatedAt: true,
        endpoints: {
          where: {
            isPublic: true,
          },
          select: {
            id: true,
            name: true,
            path: true,
            method: true,
            description: true,
          },
        },
        _count: {
          select: {
            environments: true,
            endpoints: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error('Error fetching public applications:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
