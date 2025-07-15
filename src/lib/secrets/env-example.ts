import { EnvSecretManager } from './env-manager';

/**
 * Example usage of the environment-based secret manager
 */
export async function exampleUsage(): Promise<void> {
  // Get the singleton instance
  const secretManager = EnvSecretManager.getInstance();
  
  // Initialize (normally done during application startup)
  await secretManager.init();
  
  if (!secretManager.hasProvider()) {
    console.log('No secret provider available');
    return;
  }
  
  // Store a secret
  const storeResult = await secretManager.storeSecuritySetting(
    'my-application/api-key', 
    'super-secret-api-key-value'
  );
  console.log('Store result:', storeResult);
  
  // Retrieve the secret
  const secret = await secretManager.getSecuritySetting('my-application/api-key');
  console.log('Retrieved secret:', secret);
  
  // Delete the secret
  const deleteResult = await secretManager.deleteSecuritySetting('my-application/api-key');
  console.log('Delete result:', deleteResult);
}

/**
 * Example of integrating with security settings API
 */
export async function exampleApiIntegration(applicationId: string, securityData: any): Promise<void> {
  const secretManager = EnvSecretManager.getInstance();
  
  // Ensure we have a provider
  if (!secretManager.hasProvider()) {
    console.log('No secret provider available, storing security data directly');
    // Store security data directly in your database
    return;
  }
  
  // Extract sensitive fields that should be stored in the vault
  const sensitiveFields = {
    apiKey: securityData.apiKey,
    clientSecret: securityData.clientSecret,
    // Add other sensitive fields as needed
  };
  
  // Store each sensitive field in the vault
  for (const [key, value] of Object.entries(sensitiveFields)) {
    if (value) {
      const secretKey = `application/${applicationId}/${key}`;
      await secretManager.storeSecuritySetting(secretKey, value as string);
      
      // Replace the actual value with a placeholder in the data to be stored in the database
      securityData[key] = `VAULT:${secretKey}`;
    }
  }
  
  // Now store the modified securityData in your database
  // This version has sensitive values replaced with vault references
}
