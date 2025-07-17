import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/admin/applications/[id]/details - Get full application details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In Next.js 14+, we need to await params before accessing its properties
    const { id } = await params
    
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        environments: {
          include: {
            apiKeys: {
              select: {
                id: true,
                name: true,
                status: true,
                createdAt: true,
              },
            },
            security: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        apiKeys: {
          include: {
            environment: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        endpoints: {
          // Include all fields so we get the JSON fields like pathParams, queryParams, etc.
          orderBy: {
            createdAt: 'desc',
          },
        },
        healthCheckLogs: {
          take: 10, // Limit to latest 10 logs
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json(application)
  } catch (error) {
    console.error('Error fetching application details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application details' },
      { status: 500 }
    )
  }
}
