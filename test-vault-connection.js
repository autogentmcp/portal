// Test script to validate vault connection with SSL configuration
const { EnvSecretManager } = require('./src/lib/secrets/env-manager');

async function testVaultConnection() {
  console.log('Testing vault connection...');
  
  try {
    const secretManager = new EnvSecretManager();
    await secretManager.init();
    
    const hasProvider = secretManager.hasProvider();
    console.log('Has provider:', hasProvider);
    
    if (hasProvider) {
      console.log('✅ Vault connection successful!');
      
      // Test storing and retrieving a secret
      const testKey = 'test_connection_key';
      const testValue = 'test_connection_value';
      
      console.log('Testing secret storage...');
      const storeResult = await secretManager.storeSecuritySetting(testKey, testValue);
      console.log('Store result:', storeResult);
      
      if (storeResult) {
        console.log('Testing secret retrieval...');
        const retrieveResult = await secretManager.getSecuritySetting(testKey);
        console.log('Retrieved value:', retrieveResult);
        
        if (retrieveResult === testValue) {
          console.log('✅ Vault storage and retrieval working correctly!');
        } else {
          console.log('❌ Vault retrieval failed');
        }
      } else {
        console.log('❌ Vault storage failed');
      }
    } else {
      console.log('❌ Vault connection failed');
    }
  } catch (error) {
    console.error('❌ Error testing vault connection:', error.message);
  }
}

testVaultConnection();
