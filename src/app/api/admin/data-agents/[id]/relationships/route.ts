import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const relations = await prisma.dataAgentRelation.findMany({
      where: { dataAgentId: params.id },
      include: {
        sourceTable: true,
        targetTable: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(relations);
  } catch (error) {
    console.error("Error fetching relationships:", error);
    return NextResponse.json(
      { error: "Failed to fetch relationships" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      sourceTableId,
      targetTableId,
      relationshipType,
      sourceColumn,
      targetColumn,
      description,
      example
    } = body;

    // Validate required fields
    if (!sourceTableId || !targetTableId || !relationshipType || !sourceColumn || !targetColumn) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if relationship already exists
    const existingRelation = await prisma.dataAgentRelation.findFirst({
      where: {
        dataAgentId: params.id,
        sourceTableId,
        targetTableId,
        sourceColumn,
        targetColumn
      }
    });

    if (existingRelation) {
      return NextResponse.json(
        { error: "Relationship already exists" },
        { status: 409 }
      );
    }

    const relation = await prisma.dataAgentRelation.create({
      data: {
        dataAgentId: params.id,
        sourceTableId,
        targetTableId,
        relationshipType,
        sourceColumn,
        targetColumn,
        description,
        example,
        confidence: 1.0, // Manual relationships have full confidence
        isVerified: true // Manual relationships are automatically verified
      },
      include: {
        sourceTable: true,
        targetTable: true
      }
    });

    return NextResponse.json(relation);
  } catch (error) {
    console.error("Error creating relationship:", error);
    return NextResponse.json(
      { error: "Failed to create relationship" },
      { status: 500 }
    );
  }
}
