import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'
import crypto from 'crypto'

// GET /api/admin/data-agents - List all data agents
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dataAgents = await prisma.dataAgent.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        tables: {
          include: {
            columns: true,
            _count: {
              select: {
                columns: true
              }
            }
          }
        },
        _count: {
          select: {
            tables: true,
            relations: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Manually fetch environments for each data agent
    const dataAgentsWithEnvironments = await Promise.all(
      dataAgents.map(async (agent) => {
        const environments = await prisma.environment.findMany({
          where: { dataAgentId: agent.id as any },
          select: {
            id: true,
            name: true,
            environmentType: true as any,
            status: true,
            healthStatus: true,
            lastConnectedAt: true as any,
            createdAt: true
          }
        })
        return { ...agent, environments }
      })
    )

    return NextResponse.json(dataAgentsWithEnvironments)
  } catch (error) {
    console.error('Error fetching data agents')
    return NextResponse.json(
      { error: 'Failed to fetch data agents' },
      { status: 500 }
    )
  }
}

// POST /api/admin/data-agents - Create new data agent
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, connectionType } = await request.json()

    if (!name || !connectionType) {
      return NextResponse.json(
        { error: 'Name and connection type are required' },
        { status: 400 }
      )
    }

    // Create the data agent (connection details will be added later via environments)
    const dataAgent = await prisma.dataAgent.create({
      data: {
        name,
        description,
        connectionType,
        userId: user.id,
        status: 'INACTIVE' // Will be activated when first environment is created
      }
    })

    // Fetch the complete data agent with user info
    const completeDataAgent = await prisma.dataAgent.findUnique({
      where: { id: dataAgent.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({ ...completeDataAgent, environments: [] }, { status: 201 })
  } catch (error) {
    console.error('Error creating data agent:', error)
    return NextResponse.json(
      { error: 'Failed to create data agent' },
      { status: 500 }
    )
  }
}
