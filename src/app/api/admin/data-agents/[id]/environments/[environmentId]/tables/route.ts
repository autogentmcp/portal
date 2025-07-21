import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/admin/data-agents/[id]/environments/[environmentId]/tables - Get tables for environment
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

    // Get tables for this environment
    const tables = await (prisma.dataAgentTable as any).findMany({
      where: {
        dataAgentId: id,
        environmentId: environmentId
      },
      include: {
        columns: {
          orderBy: {
            columnName: 'asc'
          }
        },
        _count: {
          select: {
            sourceRelations: true,
            targetRelations: true
          }
        }
      },
      orderBy: {
        tableName: 'asc'
      }
    });

    console.log(`Found ${tables.length} tables for environment ${environmentId}:`, tables.map(t => ({ id: t.id, tableName: t.tableName, environmentId: t.environmentId })));

    return NextResponse.json({ tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/data-agents/[id]/environments/[environmentId]/tables - Delete all tables for environment
export async function DELETE(
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

    // Delete all tables and their relationships for this environment
    await prisma.$transaction(async (tx) => {
      // Delete relationships first
      await (tx.dataAgentRelation as any).deleteMany({
        where: {
          dataAgentId: id,
          environmentId: environmentId
        }
      });

      // Delete columns
      await (tx.dataAgentTableColumn as any).deleteMany({
        where: {
          table: {
            dataAgentId: id,
            environmentId: environmentId
          }
        }
      });

      // Delete tables
      await (tx.dataAgentTable as any).deleteMany({
        where: {
          dataAgentId: id,
          environmentId: environmentId
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tables:', error);
    return NextResponse.json(
      { error: 'Failed to delete tables' },
      { status: 500 }
    );
  }
}
