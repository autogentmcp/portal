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
