import { NextRequest, NextResponse } from 'next/server';
import { getSecureLLMConfig } from '@/lib/secure-llm-config';

export async function POST(request: NextRequest) {
  try {
    console.log('Testing LLM connection...');
    
    // Get the current provider selection from the request body
    const body = await request.json().catch(() => ({}));
    const selectedProvider = body.provider || 'ollama';
    
    console.log('Testing provider:', selectedProvider);
    
    // Get the secure LLM configuration
    const config = getSecureLLMConfig();
    
    if (selectedProvider === 'openai') {
      // Test OpenAI connection
      if (!config.apiKey) {
        return NextResponse.json({
          success: false,
          message: '❌ No OpenAI API key configured. Set OPENAI_API_KEY environment variable.'
        });
      }

      try {
        const openaiUrl = config.baseURL || 'https://api.openai.com/v1';
        const testUrl = `${openaiUrl}/models`;
        
        console.log('Testing OpenAI connection to:', testUrl);
        
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          ...config.customHeaders
        };

        const response = await fetch(testUrl, {
          method: 'GET',
          headers,
          ...(config.sslOptions || {})
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            success: true,
            message: `✅ OpenAI connection successful! Found ${data.data?.length || 0} models available.`
          });
        } else {
          const errorText = await response.text();
          return NextResponse.json({
            success: false,
            message: `❌ OpenAI connection failed: ${response.status} ${response.statusText} - ${errorText}`
          });
        }
      } catch (error) {
        console.error('OpenAI test error:', error);
        return NextResponse.json({
          success: false,
          message: `❌ OpenAI connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    } else {
      // Test Ollama connection
      const ollamaUrl = process.env.OLLAMA_PROXY_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      
      try {
        console.log('Testing Ollama connection to:', ollamaUrl);
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        // Add custom headers if configured
        if (process.env.OLLAMA_CUSTOM_HEADERS) {
          try {
            const customHeaders = JSON.parse(process.env.OLLAMA_CUSTOM_HEADERS);
            Object.assign(headers, customHeaders);
          } catch (error) {
            console.warn('Failed to parse OLLAMA_CUSTOM_HEADERS:', error);
          }
        }

        const testUrl = `${ollamaUrl}/api/tags`;
        const response = await fetch(testUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          const modelCount = data.models?.length || 0;
          
          if (modelCount === 0) {
            return NextResponse.json({
              success: true,
              message: `✅ Ollama connection successful! No models found. To download models, run: "ollama pull llama3.2" or "ollama pull llama3.1"`
            });
          } else {
            return NextResponse.json({
              success: true,
              message: `✅ Ollama connection successful! Found ${modelCount} models available: ${data.models.map((m: any) => m.name).slice(0, 3).join(', ')}${modelCount > 3 ? '...' : ''}`
            });
          }
        } else {
          const errorText = await response.text();
          return NextResponse.json({
            success: false,
            message: `❌ Ollama connection failed: ${response.status} ${response.statusText} - ${errorText}`
          });
        }
      } catch (error) {
        console.error('Ollama test error:', error);
        
        if (error instanceof Error && error.name === 'TimeoutError') {
          return NextResponse.json({
            success: false,
            message: '❌ Ollama connection timeout. Make sure Ollama is running on the specified URL.'
          });
        }
        
        return NextResponse.json({
          success: false,
          message: `❌ Ollama connection error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure Ollama is running.`
        });
      }
    }

  } catch (error) {
    console.error('LLM test error:', error);
    return NextResponse.json({
      success: false,
      message: `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
