import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import { createApiKey } from '@/lib/api-keys'

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
    const envCheck = await prisma.environment.findFirst({
      where: {
        id: environmentId,
        applicationId: id,
      },
    })

    if (!envCheck) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 })
    }

    // Use the secure API key creation which handles vault storage and hashing
    const apiKey = await createApiKey({
      name,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      applicationId: id,
      environmentId,
      userId: user.id,
    });
    
    // Fetch the environment details for the response
    const environment = await prisma.environment.findUnique({
      where: { id: environmentId },
      select: {
        id: true,
        name: true,
      }
    });
    
    // Create a response object with environment details
    const apiKeyResponse = {
      ...apiKey,
      environment
    }

    return NextResponse.json(apiKeyResponse, { status: 201 })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    )
  }
}
