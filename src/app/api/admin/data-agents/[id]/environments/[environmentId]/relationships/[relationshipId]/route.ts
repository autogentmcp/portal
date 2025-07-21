import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// DELETE /api/admin/data-agents/[id]/environments/[environmentId]/relationships/[relationshipId] - Delete relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string; relationshipId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId, relationshipId } = await params;

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

    // Verify relationship belongs to this environment
    const relationship = await (prisma.dataAgentRelation as any).findUnique({
      where: { 
        id: relationshipId,
        dataAgentId: id,
        environmentId: environmentId
      }
    });

    if (!relationship) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    // Delete relationship
    await (prisma.dataAgentRelation as any).delete({
      where: { id: relationshipId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    return NextResponse.json(
      { error: 'Failed to delete relationship' },
      { status: 500 }
    );
  }
}
