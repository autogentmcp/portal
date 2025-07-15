import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// POST /api/admin/applications/[id]/environments - Create new environment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, status = 'ACTIVE' } = await request.json()

    // In Next.js 14+, we need to await params before accessing its properties
    const { id } = await params

    if (!name) {
      return NextResponse.json(
        { error: 'Environment name is required' },
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

    // Check if environment name already exists for this application
    const existingEnv = await prisma.environment.findFirst({
      where: {
        applicationId: id,
        name: name.toLowerCase(),
      },
    })

    if (existingEnv) {
      return NextResponse.json(
        { error: 'Environment with this name already exists' },
        { status: 400 }
      )
    }

    const environment = await prisma.environment.create({
      data: {
        name: name.toLowerCase(),
        status,
        applicationId: id,
      },
      include: {
        apiKeys: true,
      },
    })

    return NextResponse.json(environment, { status: 201 })
  } catch (error) {
    console.error('Error creating environment:', error)
    return NextResponse.json(
      { error: 'Failed to create environment' },
      { status: 500 }
    )
  }
}
