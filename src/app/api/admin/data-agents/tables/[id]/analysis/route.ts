import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { summary } = await request.json();
    
    // Update the table's analysis result
    const table = await prisma.dataAgentTable.update({
      where: { id: params.id },
      data: {
        analysisResult: {
          summary: summary
        }
      }
    });

    return NextResponse.json(table);
  } catch (error) {
    console.error('Error updating table analysis:', error);
    return NextResponse.json(
      { error: 'Failed to update table analysis' },
      { status: 500 }
    );
  }
}
