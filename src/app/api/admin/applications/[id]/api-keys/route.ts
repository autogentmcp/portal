import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { generateApiToken } from '@/lib/utils'

// POST /api/admin/applications/[id]/api-keys - Create new API key
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, environmentId, expiresAt } = await request.json()

    // In Next.js 14+, we need to await params before accessing its properties
    const { id } = await params

    if (!name || !environmentId) {
      return NextResponse.json(
        { error: 'Name and environment are required' },
        { status: 400 }
      )
    }

    // Check if application exists
    const application = await prisma.application.findUnique({
      where: { id },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Check if environment exists and belongs to this application
    const environment = await prisma.environment.findFirst({
      where: {
        id: environmentId,
        applicationId: id,
      },
    })

    if (!environment) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        token: generateApiToken(),
        status: 'ACTIVE',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        applicationId: id,
        environmentId,
        userId: user.id,
      },
      include: {
        environment: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(apiKey, { status: 201 })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}
