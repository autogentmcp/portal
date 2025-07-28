import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/data-agents - Public endpoint to list data agents
export async function GET(request: NextRequest) {
  try {
    const dataAgents = await prisma.dataAgent.findMany({
      where: {
        status: 'ACTIVE' // Only show active data agents on public page
      },
      include: {
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

    // Manually fetch environment counts for each data agent
    const dataAgentsWithEnvironments = await Promise.all(
      dataAgents.map(async (agent) => {
        const environmentCount = await prisma.environment.count({
          where: { dataAgentId: agent.id as any }
        })
        return { 
          ...agent, 
          _count: {
            ...agent._count,
            environments: environmentCount
          }
        }
      })
    )

    return NextResponse.json(dataAgentsWithEnvironments)
  } catch (error) {
    console.error('Error fetching public data agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data agents' },
      { status: 500 }
    )
  }
}
