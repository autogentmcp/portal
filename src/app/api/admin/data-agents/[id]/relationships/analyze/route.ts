import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getLLMService } from '@/lib/llm';

// POST /api/admin/data-agents/[id]/relationships/analyze - Analyze table relationships with LLM
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get data agent with tables and columns
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
      include: {
        tables: {
          include: {
            columns: true,
          },
        },
      },
    });

    if (!dataAgent) {
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    if (!dataAgent.tables || dataAgent.tables.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 tables to analyze relationships' }, { status: 400 });
    }

    // Prepare data for LLM analysis
    const tablesData = dataAgent.tables.map(table => ({
      name: table.tableName,
      fields: table.columns.map(column => ({
        name: column.columnName,
        dataType: column.dataType,
        isPrimaryKey: column.isPrimaryKey,
      })),
    }));

    // Analyze relationships using LLM
    const llmService = await getLLMService();
    const relationshipResult = await llmService.generateStructuredRelationships(tablesData);

    // Save the analysis to the database
    await prisma.dataAgent.update({
      where: { id },
      data: {
        relationshipAnalysis: relationshipResult.analysis,
        relationshipAnalyzedAt: new Date(),
      },
    });

    // Create relationship records from structured data
    const createdRelationships = [];
    for (const rel of relationshipResult.relationships) {
      try {
        // Find the actual table IDs
        const sourceTable = dataAgent.tables.find(t => t.tableName.toLowerCase() === rel.sourceTable.toLowerCase());
        const targetTable = dataAgent.tables.find(t => t.tableName.toLowerCase() === rel.targetTable.toLowerCase());
        
        if (sourceTable && targetTable) {
          // Check if relationship already exists
          const existingRelation = await prisma.dataAgentRelation.findFirst({
            where: {
              dataAgentId: id,
              sourceTableId: sourceTable.id,
              targetTableId: targetTable.id,
              sourceColumn: rel.sourceColumn,
              targetColumn: rel.targetColumn,
            }
          });

          if (!existingRelation) {
            const createdRelation = await prisma.dataAgentRelation.create({
              data: {
                dataAgentId: id,
                sourceTableId: sourceTable.id,
                targetTableId: targetTable.id,
                relationshipType: rel.relationshipType,
                sourceColumn: rel.sourceColumn,
                targetColumn: rel.targetColumn,
                description: rel.description,
                example: rel.example,
                confidence: rel.confidence,
                isVerified: false, // AI-generated relationships are not verified by default
              },
              include: {
                sourceTable: true,
                targetTable: true,
              }
            });
            createdRelationships.push(createdRelation);
          }
        }
      } catch (error) {
        console.warn(`Failed to create relationship ${rel.sourceTable}.${rel.sourceColumn} -> ${rel.targetTable}.${rel.targetColumn}:`, error);
      }
    }

    return NextResponse.json({
      message: 'Relationship analysis completed successfully',
      analysis: relationshipResult.analysis,
      relationshipsCreated: createdRelationships.length,
      totalSuggestions: relationshipResult.relationships.length,
      usage: relationshipResult.usage,
    });

  } catch (error) {
    console.error('Error analyzing relationships:', error);
    return NextResponse.json(
      { error: 'Failed to analyze relationships', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
