import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// PATCH /api/admin/data-agents/[id]/relationships/[relationshipId] - Update relationship
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; relationshipId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, relationshipId } = await params;
    const body = await request.json();

    // Validate data agent exists
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
    });

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    // Find the relationship and ensure it belongs to this data agent
    const existingRelationship = await (prisma.dataAgentRelation as any).findUnique({
      where: { id: relationshipId },
    });

    if (!existingRelationship || existingRelationship.dataAgentId !== id) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    // Update the relationship
    const updatedRelationship = await (prisma.dataAgentRelation as any).update({
      where: { id: relationshipId },
      data: {
        ...(body.isVerified !== undefined && { isVerified: body.isVerified }),
        ...(body.description && { description: body.description }),
        ...(body.example && { example: body.example }),
        ...(body.relationshipType && { relationshipType: body.relationshipType }),
        ...(body.confidence !== undefined && { confidence: body.confidence }),
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
      }
    });

    return NextResponse.json({ relationship: updatedRelationship });
  } catch (error) {
    console.error('Error updating relationship:', error);
    return NextResponse.json(
      { error: 'Failed to update relationship' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/data-agents/[id]/relationships/[relationshipId] - Delete relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; relationshipId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, relationshipId } = await params;

    // Validate data agent exists
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
    });

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    // Find the relationship and ensure it belongs to this data agent
    const existingRelationship = await (prisma.dataAgentRelation as any).findUnique({
      where: { id: relationshipId },
    });

    if (!existingRelationship || existingRelationship.dataAgentId !== id) {
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    }

    // Delete the relationship
    await (prisma.dataAgentRelation as any).delete({
      where: { id: relationshipId },
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
