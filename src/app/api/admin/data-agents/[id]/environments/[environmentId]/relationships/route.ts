import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/admin/data-agents/[id]/environments/[environmentId]/relationships - Get relationships for environment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId } = await params;

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
    });

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    // Get environment
    const environment = await (prisma.environment as any).findUnique({
      where: { id: environmentId }
    });

    if (!environment || environment.dataAgentId !== id) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    // Get relationships for this environment
    const relationships = await (prisma.dataAgentRelation as any).findMany({
      where: {
        dataAgentId: id,
        environmentId: environmentId
      },
      include: {
        sourceTable: {
          include: {
            columns: true
          }
        },
        targetTable: {
          include: {
            columns: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ relationships });
  } catch (error) {
    console.error('Error fetching relationships:', error);
    return NextResponse.json(
      { error: 'Failed to fetch relationships' },
      { status: 500 }
    );
  }
}

// POST /api/admin/data-agents/[id]/environments/[environmentId]/relationships - Create new relationship
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId } = await params;
    const body = await request.json();
    const { fromTableId, toTableId, fromColumn, toColumn, relationshipType, description } = body;

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
    });

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    // Get environment
    const environment = await (prisma.environment as any).findUnique({
      where: { id: environmentId }
    });

    if (!environment || environment.dataAgentId !== id) {
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    // Verify tables belong to this environment
    const fromTable = await (prisma.dataAgentTable as any).findUnique({
      where: { 
        id: fromTableId,
        environmentId: environmentId 
      }
    });

    const toTable = await (prisma.dataAgentTable as any).findUnique({
      where: { 
        id: toTableId,
        environmentId: environmentId 
      }
    });

    if (!fromTable || !toTable) {
      return NextResponse.json({ error: 'Tables not found in this environment' }, { status: 404 });
    }

    // Create relationship
    const relationship = await (prisma.dataAgentRelation as any).create({
      data: {
        dataAgentId: id,
        environmentId: environmentId,
        sourceTableId: fromTableId,
        targetTableId: toTableId,
        sourceColumn: fromColumn,
        targetColumn: toColumn,
        relationshipType,
        description
      },
      include: {
        sourceTable: true,
        targetTable: true
      }
    });

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    console.error('Error creating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to create relationship' },
      { status: 500 }
    );
  }
}
