import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// PUT /api/admin/data-agents/columns/[id] - Update column description
export async function PUT(
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
    const { description } = body;

    if (typeof description !== 'string') {
      return NextResponse.json({ error: 'Description must be a string' }, { status: 400 });
    }

    const column = await prisma.dataAgentTableColumn.update({
      where: { id },
      data: { comment: description },
    });

    return NextResponse.json(column);
  } catch (error) {
    console.error('Error updating column description:', error);
    return NextResponse.json(
      { error: 'Failed to update column description' },
      { status: 500 }
    );
  }
}
