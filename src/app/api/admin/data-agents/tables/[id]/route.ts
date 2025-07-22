import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// GET /api/admin/data-agents/tables/[id] - Get specific table details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const table = await prisma.dataAgentTable.findUnique({
      where: { id },
      include: {
        dataAgent: {
          select: {
            id: true,
            name: true,
          },
        },
        columns: {
          orderBy: {
            columnName: 'asc',
          },
        },
      },
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json(table);
  } catch (error) {
    console.error('Error fetching table details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table details' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/data-agents/tables/[id] - Delete table and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get table info before deletion
    const table = await prisma.dataAgentTable.findUnique({
      where: { id },
      include: {
        dataAgent: true,
        environment: true,
      },
    });

    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Start transaction to ensure all deletions succeed or fail together
    await prisma.$transaction(async (tx) => {
      // 1. Delete all relationships where this table is source or target
      await tx.dataAgentRelation.deleteMany({
        where: {
          OR: [
            { sourceTableId: id },
            { targetTableId: id }
          ]
        }
      });

      // 2. Delete all columns for this table
      await tx.dataAgentTableColumn.deleteMany({
        where: { tableId: id }
      });

      // 3. Delete the table itself
      await tx.dataAgentTable.delete({
        where: { id }
      });

      // 4. Clear relationship analysis from data agent (will be regenerated)
      await tx.dataAgent.update({
        where: { id: table.dataAgentId },
        data: {
          relationshipAnalysis: null,
          relationshipAnalyzedAt: null
        }
      });

      // 5. Clear relationship analysis from environment (will be regenerated)
      if (table.environmentId) {
        await (tx.environment as any).update({
          where: { id: table.environmentId },
          data: {
            relationshipAnalysis: null,
            relationshipAnalyzedAt: null
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Table ${table.tableName} and all related data deleted successfully`,
      deletedTable: {
        id: table.id,
        tableName: table.tableName,
        dataAgentId: table.dataAgentId,
        environmentId: table.environmentId
      }
    });

  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      { error: 'Failed to delete table', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/data-agents/tables/[id] - Update table details
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { description, ...otherUpdates } = body;

    const updatedTable = await prisma.dataAgentTable.update({
      where: { id },
      data: {
        description,
        ...otherUpdates,
        updatedAt: new Date()
      },
      include: {
        columns: {
          orderBy: { columnName: 'asc' }
        },
        dataAgent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      table: updatedTable
    });

  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { error: 'Failed to update table', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
