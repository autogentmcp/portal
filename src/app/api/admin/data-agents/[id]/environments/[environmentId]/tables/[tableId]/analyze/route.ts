import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getLLMService } from '@/lib/llm';
import { DatabaseConnectionManager } from '@/lib/database/connection-manager';

// POST /api/admin/data-agents/[id]/environments/[environmentId]/tables/[tableId]/analyze
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; environmentId: string; tableId: string } }
) {
  console.log('🔍 Table analysis request received');
  
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      console.log('❌ Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.email);

    const { id, environmentId, tableId } = await params;
    console.log('📋 Request parameters:', { id, environmentId, tableId });

    // Get data agent
    const dataAgent = await prisma.dataAgent.findUnique({
      where: { id },
    });

    if (!dataAgent) {
      console.log('❌ Data agent not found:', id);
      return NextResponse.json({ error: 'Data agent not found' }, { status: 404 });
    }

    console.log('✅ Data agent found:', dataAgent.name);

    // Get environment
    const environment = await (prisma.environment as any).findUnique({
      where: { id: environmentId },
    });

    if (!environment || environment.dataAgentId !== id) {
      console.log('❌ Environment not found or mismatch:', { environmentId, dataAgentId: environment?.dataAgentId });
      return NextResponse.json({ error: 'Environment not found' }, { status: 404 });
    }

    console.log('✅ Environment found:', environment.name);

    // Get table
    const table = await (prisma.dataAgentTable as any).findUnique({
      where: { id: tableId },
      include: {
        columns: true
      }
    });

    if (!table || table.environmentId !== environmentId) {
      console.log('❌ Table not found or environment mismatch:', { tableId, expectedEnv: environmentId, actualEnv: table?.environmentId });
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    console.log('✅ Table found:', table.tableName, 'with', table.columns?.length || 0, 'columns');

    // Update table analysis status to ANALYZING
    console.log('🔄 Setting table status to ANALYZING for table:', table.tableName);
    await (prisma.dataAgentTable as any).update({
      where: { id: tableId },
      data: {
        analysisStatus: 'ANALYZING',
        updatedAt: new Date()
      }
    });
    console.log('✅ Table status updated to ANALYZING');

    // Perform real analysis with AI-powered column descriptions
    try {
      console.log('🤖 Initializing LLM service...');
      const llmService = await getLLMService();
      
      console.log('🔌 Attempting to connect to database and fetch sample data...');
      
      // connectionConfig should already be parsed JSON object from Prisma
      const connectionConfig = environment.connectionConfig || {};
      
      // Get credentials from vault
      let credentials = null;
      if (environment.vaultKey) {
        try {
          const { SecretManager } = await import('@/lib/secrets');
          const secretManager = SecretManager.getInstance();
          await secretManager.init();
          
          if (secretManager.hasProvider()) {
            credentials = await secretManager.getCredentials(environment.vaultKey);
            console.log('✅ Retrieved credentials from vault');
            
            // Ensure password is a string
            if (credentials && credentials.password && typeof credentials.password !== 'string') {
              credentials.password = String(credentials.password);
            }
          }
        } catch (error) {
          console.error('❌ Error retrieving credentials from vault:', error);
        }
      }
      
      console.log('🔧 Connection details:', {
        type: dataAgent.connectionType,
        host: connectionConfig.host,
        port: connectionConfig.port,
        database: connectionConfig.database,
        hasCredentials: !!(credentials?.username && credentials?.password)
      });
      
      // Get sample data from the database
      const sampleData = await DatabaseConnectionManager.querySampleData(
        dataAgent.connectionType,
        connectionConfig,
        credentials || { username: '', password: '' },
        table.tableName,
        undefined, // schema name - can add support later
        10 // limit to 10 rows
      );
      console.log('✅ Sample data retrieved:', sampleData?.length || 0, 'rows');
      
      // Extract sample values for each imported column only
      const columnSamples: { [columnName: string]: string[] } = {};
      
      if (sampleData && sampleData.length > 0) {
        console.log('🔍 Extracting sample values for imported columns...');
        (table.columns || []).forEach((column: any) => {
          columnSamples[column.columnName] = sampleData
            .map((row: any) => row[column.columnName])
            .filter((value: any) => value != null)
            .slice(0, 5)
            .map((value: any) => {
              // Handle different data types properly
              if (value instanceof Date) {
                return value.toISOString().split('T')[0]; // Format as YYYY-MM-DD
              }
              if (typeof value === 'object' && value !== null) {
                return JSON.stringify(value);
              }
              return String(value);
            });
          console.log(`📝 Column ${column.columnName}: ${columnSamples[column.columnName]?.length || 0} sample values`);
        });
      } else {
        console.log('⚠️ No sample data available for analysis');
      }
      
      // Process each column with AI analysis - only analyze columns that were actually imported
      console.log('🧠 Starting AI analysis for', table.columns?.length || 0, 'imported columns...');
      
      // Define the type for column analyses
      interface ColumnAnalysis {
        columnName: string;
        description: string;
        exampleValue: string;
        valueType: string;
        error?: string;
      }
      
      const columnAnalyses: ColumnAnalysis[] = [];
      
      // Only analyze columns that exist in our database (i.e., were selected during import)
      const importedColumns = table.columns || [];
      console.log('📋 Imported columns to analyze:', importedColumns.map((col: any) => col.columnName));
      
      for (const column of importedColumns) {
        console.log(`\n==============================\n🔍 Analyzing imported column: ${column.columnName} (${column.dataType})`);
        // Use the extracted sample values for this column
        const sampleValues = columnSamples[column.columnName] || [];
        console.log(`📝 Using ${sampleValues.length} sample values for ${column.columnName}:`, sampleValues.slice(0, 3));
        try {
          // Generate AI description
          console.log(`🤖 [${column.columnName}] Requesting AI analysis with:`, {
            tableName: table.tableName,
            columnName: column.columnName,
            dataType: column.dataType,
            isNullable: column.isNullable,
            isPrimaryKey: column.isPrimaryKey,
            sampleValues
          });
          const aiAnalysis = await llmService.generateBriefColumnDescription({
            tableName: table.tableName,
            columnName: column.columnName,
            dataType: column.dataType,
            isNullable: column.isNullable,
            isPrimaryKey: column.isPrimaryKey,
            sampleValues
          });
          console.log(`✅ [${column.columnName}] AI analysis result:`, aiAnalysis);

          // Update column with AI description (save everything in aiDescription as JSON)
          const structuredAiDescription = JSON.stringify({
            purpose: aiAnalysis.description, // This is just the purpose text
            sample_value: aiAnalysis.exampleValue,
            data_pattern: aiAnalysis.valueType
          });
          console.log(`💾 [${column.columnName}] Updating database with structured description:`, structuredAiDescription);
          await (prisma.dataAgentTableColumn as any).update({
            where: { id: column.id },
            data: {
              aiDescription: structuredAiDescription,
              updatedAt: new Date()
            }
          });
          console.log(`✅ [${column.columnName}] Column updated in database.`);

          columnAnalyses.push({
            columnName: column.columnName,
            description: aiAnalysis.description,
            exampleValue: aiAnalysis.exampleValue,
            valueType: aiAnalysis.valueType
          });
        } catch (columnError) {
          console.error(`❌ [${column.columnName}] Error analyzing column:`, columnError);
          columnAnalyses.push({
            columnName: column.columnName,
            description: `${column.columnName.replace(/_/g, ' ').toLowerCase()} field`,
            exampleValue: 'sample_value',
            valueType: 'text',
            error: columnError instanceof Error ? columnError.message : 'Unknown error'
          });
        }
      }

      console.log('📊 Column analysis complete! Processed', columnAnalyses.length, 'columns');

      // Now perform comprehensive table-level analysis
      console.log('🧠 Starting comprehensive table-level analysis...');
      
      let tableAnalysisSummary = `AI analysis completed for ${table.tableName}`;
      let businessPurpose = '';
      let dataPatterns = '';
      let recommendations = [];
      
      try {
        console.log('🔍 Preparing table analysis request...');
        
        // Prepare fields data for table analysis
        const fields = table.columns.map((column: any) => {
          const aiDescriptionData = columnAnalyses.find(ca => ca.columnName === column.columnName);
          return {
            name: column.columnName,
            dataType: column.dataType,
            isNullable: column.isNullable,
            isPrimaryKey: column.isPrimaryKey,
            isForeignKey: false, // We don't have FK info for BigQuery
            isUnique: false,
            isIndexed: false,
            constraints: [],
            sampleValues: sampleData && sampleData.length > 0 
              ? sampleData.map((row: any) => row[column.columnName])
                  .filter((val: any) => val != null)
                  .slice(0, 5)
                  .map((val: any) => {
                    if (val instanceof Date) {
                      return val.toISOString().split('T')[0];
                    }
                    if (typeof val === 'object' && val !== null) {
                      return JSON.stringify(val);
                    }
                    return String(val);
                  })
              : []
          };
        });

        const tableAnalysisRequest = {
          tableName: table.tableName,
          fields: fields,
          rowCount: sampleData?.length || 0,
          note: `Analysis of ${table.tableName} table in ${environment.name} environment`
        };

        console.log('🤖 Calling LLM for comprehensive table analysis...');
        const tableAnalysisResponse = await llmService.analyzeTable(tableAnalysisRequest);
        
        console.log('✅ Table analysis response received from LLM');
        const analysisContent = tableAnalysisResponse.content;
        
        // Parse the comprehensive analysis content
        if (analysisContent && analysisContent.length > 50) {
          tableAnalysisSummary = analysisContent;
          
          // Try to extract specific sections
          const businessMatch = analysisContent.match(/\*\*Business Purpose\*\*:?\s*([^*]+)/i);
          if (businessMatch) {
            businessPurpose = businessMatch[1].trim();
          }
          
          const patternsMatch = analysisContent.match(/\*\*Data Patterns\*\*:?\s*([^*]+)/i);
          if (patternsMatch) {
            dataPatterns = patternsMatch[1].trim();
          }
          
          // Extract recommendations
          const recsMatch = analysisContent.match(/\*\*Usage Recommendations\*\*:?\s*([^*]+)/i);
          if (recsMatch) {
            recommendations.push(recsMatch[1].trim());
          }
        }
        
        console.log('📝 Table analysis summary length:', tableAnalysisSummary.length, 'characters');
        
      } catch (tableAnalysisError) {
        console.error('⚠️ Table-level analysis failed, using basic summary:', tableAnalysisError);
        // Continue with basic analysis if table-level analysis fails
      }

      const analysisResult = {
        summary: tableAnalysisSummary,
        businessPurpose: businessPurpose,
        dataPatterns: dataPatterns,
        columnsAnalyzed: columnAnalyses.length,
        columns: columnAnalyses,
        suggestedImprovements: [
          'AI-generated descriptions have been added to all columns',
          'Example values and data types have been classified',
          'Comprehensive table analysis completed',
          'Review the descriptions for accuracy and adjust if needed',
          ...recommendations
        ],
        analyzedAt: new Date().toISOString()
      };

      console.log('💾 Updating table status to COMPLETED...');
      // Mark analysis as completed
      const updatedTable = await (prisma.dataAgentTable as any).update({
        where: { id: tableId },
        data: {
          analysisStatus: 'COMPLETED',
          analysisResult: analysisResult,
          updatedAt: new Date()
        },
        include: {
          columns: true
        }
      });
      console.log('✅ Table analysis marked as COMPLETED');

      console.log('🎉 Returning success response with updated table data');
      return NextResponse.json({ 
        success: true,
        message: 'AI-powered table analysis completed',
        result: analysisResult,
        updatedTable: updatedTable
      });

    } catch (analysisError) {
      console.error('❌ Analysis error:', analysisError);
      
      console.log('💾 Marking table analysis as FAILED...');
      // Mark as failed
      await (prisma.dataAgentTable as any).update({
        where: { id: tableId },
        data: {
          analysisStatus: 'FAILED',
          analysisResult: {
            error: 'AI analysis failed',
            message: analysisError instanceof Error ? analysisError.message : 'Unknown error',
            analyzedAt: new Date().toISOString()
          },
          updatedAt: new Date()
        }
      });
      console.log('✅ Table marked as FAILED');

      return NextResponse.json(
        { error: 'Analysis failed', details: analysisError instanceof Error ? analysisError.message : 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Unexpected error analyzing table:', error);
    return NextResponse.json(
      { error: 'Failed to analyze table', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
