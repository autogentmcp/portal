import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { generateAppKey, generateApiToken } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const applications = await prisma.application.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            environments: true,
            apiKeys: true,
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
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/applications - Create new application
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, description, status = 'ACTIVE' } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: 'Application name is required' },
        { status: 400 }
      )
    }

    const appKey = generateAppKey()

    const application = await prisma.application.create({
      data: {
        name,
        description,
        appKey,
        status,
        userId: user.id,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            environments: true,
            apiKeys: true,
            endpoints: true,
          },
        },
      },
    })

    // Create default environments
    const environments = ['development', 'staging', 'production']
    await Promise.all(
      environments.map(env =>
        prisma.environment.create({
          data: {
            name: env,
            applicationId: application.id,
          },
        })
      )
    )

    // Create default API keys for each environment
    const createdEnvironments = await prisma.environment.findMany({
      where: { applicationId: application.id },
    })

    await Promise.all(
      createdEnvironments.map(env =>
        prisma.apiKey.create({
          data: {
            name: `${env.name}-key`,
            token: generateApiToken(),
            environmentId: env.id,
            applicationId: application.id,
            userId: user.id,
          },
        })
      )
    )

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Error creating application:', error)
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    )
  }
}
