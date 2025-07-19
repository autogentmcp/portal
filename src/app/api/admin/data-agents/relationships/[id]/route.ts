import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      relationshipType,
      sourceColumn,
      targetColumn,
      description,
      example
    } = body;

    const relation = await prisma.dataAgentRelation.update({
      where: { id: params.id },
      data: {
        ...(relationshipType && { relationshipType }),
        ...(sourceColumn && { sourceColumn }),
        ...(targetColumn && { targetColumn }),
        ...(description !== undefined && { description }),
        ...(example !== undefined && { example }),
        isVerified: true // Updated manually means verified
      },
      include: {
        sourceTable: true,
        targetTable: true
      }
    });

    return NextResponse.json(relation);
  } catch (error) {
    console.error("Error updating relationship:", error);
    return NextResponse.json(
      { error: "Failed to update relationship" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.dataAgentRelation.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting relationship:", error);
    return NextResponse.json(
      { error: "Failed to delete relationship" },
      { status: 500 }
    );
  }
}
