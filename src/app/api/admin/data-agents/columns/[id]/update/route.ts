import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { aiDescription } = body;

    if (!aiDescription || typeof aiDescription !== 'string') {
      return NextResponse.json(
        { error: "AI description is required" },
        { status: 400 }
      );
    }

    const column = await prisma.dataAgentTableColumn.update({
      where: { id: params.id },
      data: { aiDescription }
    });

    return NextResponse.json(column);
  } catch (error) {
    console.error("Error updating column description:", error);
    return NextResponse.json(
      { error: "Failed to update column description" },
      { status: 500 }
    );
  }
}
