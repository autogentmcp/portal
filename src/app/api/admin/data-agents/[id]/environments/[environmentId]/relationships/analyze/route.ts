import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getLLMService } from '@/lib/llm';

// POST /api/admin/data-agents/[id]/environments/[environmentId]/relationships/analyze - Analyze table relationships with LLM for environment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string } }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, environmentId } = await params;

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

    // Get tables with columns for this environment
    const tables = await (prisma.dataAgentTable as any).findMany({
      where: {
        dataAgentId: id,
        environmentId: environmentId
      },
      include: {
        columns: true,
      },
    });

    if (!tables || tables.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 tables to analyze relationships' }, { status: 400 });
    }

    // Prepare data for LLM analysis
    const tablesData = tables.map((table: any) => ({
      name: table.tableName,
      fields: table.columns.map((column: any) => ({
        name: column.columnName,
        dataType: column.dataType,
        isPrimaryKey: column.isPrimaryKey,
      })),
    }));

    // Analyze relationships using LLM
    const llmService = getLLMService();

    try {
      const analysisResult = await llmService.generateStructuredRelationships(tablesData);
      
      // Validate and store suggested relationships
      const suggestedRelationships = [];
      
      for (const rel of analysisResult.relationships) {
        // Find the actual table records
        const fromTable = tables.find((t: any) => t.tableName === rel.sourceTable);
        const toTable = tables.find((t: any) => t.tableName === rel.targetTable);
        
        if (!fromTable || !toTable) {
          continue;
        }

        // Validate columns exist
        const fromColumn = fromTable.columns.find((c: any) => c.columnName === rel.sourceColumn);
        const toColumn = toTable.columns.find((c: any) => c.columnName === rel.targetColumn);
        
        if (!fromColumn || !toColumn) {
          continue;
        }

        // Map relationship type to our enum values
        const relationshipType = rel.relationshipType === 'one_to_one' ? 'ONE_TO_ONE' :
                               rel.relationshipType === 'one_to_many' ? 'ONE_TO_MANY' :
                               rel.relationshipType === 'many_to_many' ? 'MANY_TO_MANY' : 'ONE_TO_MANY';

        // Check if relationship already exists
        const existingRelation = await (prisma.dataAgentRelation as any).findFirst({
          where: {
            dataAgentId: id,
            environmentId: environmentId,
            sourceTableId: fromTable.id,
            targetTableId: toTable.id,
            sourceColumn: rel.sourceColumn,
            targetColumn: rel.targetColumn
          }
        });

        if (!existingRelation) {
          // Create the relationship in the database
          const createdRelation = await (prisma.dataAgentRelation as any).create({
            data: {
              dataAgentId: id,
              environmentId: environmentId,
              sourceTableId: fromTable.id,
              targetTableId: toTable.id,
              sourceColumn: rel.sourceColumn,
              targetColumn: rel.targetColumn,
              relationshipType: rel.relationshipType,
              description: rel.description,
              example: rel.example,
              confidence: rel.confidence,
              isVerified: false // Default to unverified, admin can verify later
            }
          });
          
          suggestedRelationships.push({
            id: createdRelation.id,
            sourceTableId: fromTable.id,
            sourceTableName: fromTable.tableName,
            sourceColumn: rel.sourceColumn,
            targetTableId: toTable.id,
            targetTableName: toTable.tableName,
            targetColumn: rel.targetColumn,
            relationshipType: rel.relationshipType,
            confidence: rel.confidence,
            description: rel.description,
            example: rel.example,
            isVerified: false
          });
        }
      }

      return NextResponse.json({
        success: true,
        createdRelationships: suggestedRelationships.length,
        relationships: suggestedRelationships,
        analysis: analysisResult.analysis || 'Relationship analysis completed',
        usage: analysisResult.usage
      });

    } catch (llmError: any) {
      console.error('LLM analysis failed:', llmError);
      return NextResponse.json({ 
        error: 'Failed to analyze relationships with LLM',
        details: llmError?.message || 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error analyzing relationships:', error);
    return NextResponse.json(
      { error: 'Failed to analyze relationships' },
      { status: 500 }
    );
  }
}
