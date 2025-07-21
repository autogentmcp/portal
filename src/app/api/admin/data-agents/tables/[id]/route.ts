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
    const data = await request.json();

    const updatedTable = await prisma.dataAgentTable.update({
      where: { id },
      data: {
        description: data.description,
        ...(data.tableName && { tableName: data.tableName }),
      },
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

    return NextResponse.json(updatedTable);
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/data-agents/tables/[id] - Delete table and cleanup
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

    // Use transaction to ensure all deletions happen atomically
    await prisma.$transaction(async (tx) => {
      // First, get the table to access its relationships
      const table = await tx.dataAgentTable.findUnique({
        where: { id },
        select: {
          id: true,
          tableName: true,
          dataAgentId: true,
          environmentId: true,
        }
      });

      if (!table) {
        throw new Error('Table not found');
      }

      // 1. Delete all relationships involving this table
      await tx.dataAgentRelation.deleteMany({
        where: {
          OR: [
            { sourceTableId: table.id },
            { targetTableId: table.id }
          ]
        }
      });

      // 2. Delete all columns of this table
      await tx.dataAgentTableColumn.deleteMany({
        where: { tableId: table.id }
      });

      // 3. Delete the table itself
      await tx.dataAgentTable.delete({
        where: { id: table.id }
      });

      // 4. Clear analysis data from the data agent (will be regenerated)
      await tx.dataAgent.update({
        where: { id: table.dataAgentId },
        data: {
          relationshipAnalysis: null,
          relationshipAnalyzedAt: null
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Table and all related data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting table:', error);
    
    if (error instanceof Error && error.message === 'Table not found') {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }
    
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    );
  }
}
