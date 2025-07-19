import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// DELETE /api/admin/data-agents/[id]/environments/[environmentId]/tables/[tableId] - Delete specific table
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string; tableId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId, tableId } = await params;

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

    // Verify table belongs to this environment
    const table = await (prisma.dataAgentTable as any).findUnique({
      where: { 
        id: tableId,
        dataAgentId: id,
        environmentId: environmentId
      }
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Delete table and its related data
    await prisma.$transaction(async (tx) => {
      // Delete relationships involving this table
      await (tx.dataAgentRelation as any).deleteMany({
        where: {
          OR: [
            { sourceTableId: tableId },
            { targetTableId: tableId }
          ]
        }
      });

      // Delete columns
      await (tx.dataAgentTableColumn as any).deleteMany({
        where: { tableId }
      });

      // Delete table
      await (tx.dataAgentTable as any).delete({
        where: { id: tableId }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    );
  }
}

// GET /api/admin/data-agents/[id]/environments/[environmentId]/tables/[tableId] - Get specific table details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string; tableId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId, tableId } = await params;

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

    // Get table with details
    const table = await (prisma.dataAgentTable as any).findUnique({
      where: { 
        id: tableId,
        dataAgentId: id,
        environmentId: environmentId
      },
      include: {
        columns: {
          orderBy: {
            columnName: 'asc'
          }
        },
        sourceRelations: {
          include: {
            targetTable: true
          }
        },
        targetRelations: {
          include: {
            sourceTable: true
          }
        }
      }
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table' },
      { status: 500 }
    );
  }
}
