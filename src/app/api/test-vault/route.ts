import { NextRequest, NextResponse } from 'next/server'
import { EnvSecretManager } from '@/lib/secrets/env-manager'

// GET /api/test-vault - Test vault connection
export async function GET(request: NextRequest) {
  try {
    console.log('Testing vault connection...')
    
    const secretManager = new EnvSecretManager()
    await secretManager.init()
    
    const hasProvider = secretManager.hasProvider()
    console.log('Has provider:', hasProvider)
    
    if (hasProvider) {
      console.log('✅ Vault connection successful!')
      
      // Test storing and retrieving a secret
      const testKey = 'test_connection_key'
      const testValue = 'test_connection_value'
      
      console.log('Testing secret storage...')
      const storeResult = await secretManager.storeSecuritySetting(testKey, testValue)
      console.log('Store result:', storeResult)
      
      if (storeResult) {
        console.log('Testing secret retrieval...')
        const retrieveResult = await secretManager.getSecuritySetting(testKey)
        console.log('Retrieved value:', retrieveResult)
        
        if (retrieveResult === testValue) {
          console.log('✅ Vault storage and retrieval working correctly!')
          return NextResponse.json({ 
            success: true, 
            message: 'Vault connection and operations working correctly',
            details: {
              hasProvider: true,
              storeResult: true,
              retrieveResult: true
            }
          })
        } else {
          console.log('❌ Vault retrieval failed')
          return NextResponse.json({ 
            success: false, 
            message: 'Vault retrieval failed',
            details: {
              hasProvider: true,
              storeResult: true,
              retrieveResult: false
            }
          })
        }
      } else {
        console.log('❌ Vault storage failed')
        return NextResponse.json({ 
          success: false, 
          message: 'Vault storage failed',
          details: {
            hasProvider: true,
            storeResult: false,
            retrieveResult: false
          }
        })
      }
    } else {
      console.log('❌ Vault connection failed')
      return NextResponse.json({ 
        success: false, 
        message: 'Vault connection failed',
        details: {
          hasProvider: false,
          storeResult: false,
          retrieveResult: false
        }
      })
    }
  } catch (error) {
    console.error('❌ Error testing vault connection:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Error testing vault connection',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
