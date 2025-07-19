import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getLLMService } from '@/lib/llm';

// POST /api/admin/llm/test - Test LLM connection
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const llmService = getLLMService();
    const result = await llmService.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing LLM connection:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test LLM connection',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
