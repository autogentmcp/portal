import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    
    const relations = await prisma.dataAgentRelation.findMany({
      where: { dataAgentId: id },
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
    const { id } = await params;
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

    // Get the environment ID from the source table
    const sourceTable = await prisma.dataAgentTable.findUnique({
      where: { id: sourceTableId },
      select: { environmentId: true }
    });

    if (!sourceTable) {
      return NextResponse.json(
        { error: "Source table not found" },
        { status: 404 }
      );
    }

    // Check if relationship already exists
    const existingRelation = await prisma.dataAgentRelation.findFirst({
      where: {
        dataAgentId: id,
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
        dataAgentId: id,
        environmentId: sourceTable.environmentId,
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
