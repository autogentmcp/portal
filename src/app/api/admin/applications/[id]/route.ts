import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// PUT /api/admin/applications/[id] - Update application
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, status } = await request.json()
    
    // In Next.js 14+, we need to await params before accessing its properties
    const { id } = await params

    const application = await prisma.application.update({
      where: { id },
      data: {
        name,
        description,
        status,
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

    return NextResponse.json(application)
  } catch (error) {
    console.error('Error updating application:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/applications/[id] - Delete application
export async function DELETE(
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

    // Delete related records first (cascade)
    await prisma.auditLog.deleteMany({
      where: { applicationId: id },
    })

    await prisma.apiKey.deleteMany({
      where: { applicationId: id },
    })

    await prisma.endpoint.deleteMany({
      where: { applicationId: id },
    })

    await prisma.environment.deleteMany({
      where: { applicationId: id },
    })

    // Delete the application
    await prisma.application.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting application:', error)
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    )
  }
}
