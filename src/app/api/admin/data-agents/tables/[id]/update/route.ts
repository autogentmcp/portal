import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { description } = body;

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const table = await prisma.dataAgentTable.update({
      where: { id: params.id },
      data: { description },
      include: {
        columns: true
      }
    });

    return NextResponse.json(table);
  } catch (error) {
    console.error("Error updating table description:", error);
    return NextResponse.json(
      { error: "Failed to update table description" },
      { status: 500 }
    );
  }
}
