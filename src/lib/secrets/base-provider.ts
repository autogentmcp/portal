import { logError, logInfo } from '../utils/logger';

/**
 * Base class for secret providers with common encoding/decoding functionality
 */
export abstract class BaseSecretProvider {
  /**
   * Encode a secret value to prevent tampering and formatting issues
   * @param value The raw secret value
   */
  protected encodeSecretValue(value: string): string {
    try {
      // Base64 encode the value to preserve formatting and prevent tampering
      return Buffer.from(value, 'utf8').toString('base64');
    } catch (error) {
      logError('Error encoding secret value', error);
      // Fallback to original value if encoding fails
      return value;
    }
  }

  /**
   * Decode a secret value from Base64
   * @param encodedValue The Base64 encoded secret value
   */
  protected decodeSecretValue(encodedValue: string): string {
    try {
      // Check if the value is Base64 encoded
      if (this.isBase64(encodedValue)) {
        return Buffer.from(encodedValue, 'base64').toString('utf8');
      }
      // If not Base64, return as-is (backward compatibility)
      return encodedValue;
    } catch (error) {
      logError('Error decoding secret value', error);
      // Fallback to original value if decoding fails
      return encodedValue;
    }
  }

  /**
   * Check if a string is Base64 encoded
   * @param str The string to check
   */
  private isBase64(str: string): boolean {
    try {
      // Base64 regex pattern
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      
      // Check if it matches Base64 pattern and has correct length
      if (!base64Regex.test(str) || str.length % 4 !== 0) {
        return false;
      }
      
      // Try to decode and re-encode to verify it's valid Base64
      const decoded = Buffer.from(str, 'base64').toString('utf8');
      const reencoded = Buffer.from(decoded, 'utf8').toString('base64');
      
      return reencoded === str;
    } catch {
      return false;
    }
  }

  /**
   * Check if a field contains sensitive data that should be encoded
   * @param fieldName The name of the field
   */
  protected isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'secret',
      'privatekey',
      'keyfile',
      'token',
      'subscriptionkey',
      'sessiontoken',
      'clientsecret',
      'jwtsecret',
      'bearertoken',
      'basicauthpassword',
      'secretkeys',
      'awssecretkey',
      'azureapimsubscriptionkey',
      'oauth2clientsecret',
      'signatureprivatekey',
      'gcpkeyfile',
      'azuresubscription',
      'azurekeyvault',
      'awsaccesskey',
      'awsregion',
      'awsiamrole',
      'gcpprojectid',
      'gcpserviceaccount',
      'oauth2clientid',
      'oauth2authurl',
      'oauth2tokenurl',
      'oauth2scopes',
      'jwtexpiration',
      'signaturekeyversion',
      'signatureuniqueid',
      'signaturealgorithm',
      'apikeyheader',
      'customheaders'
    ];
    
    const lowerFieldName = fieldName.toLowerCase().replace(/[^a-z]/g, '');
    return sensitiveFields.some(sensitive => lowerFieldName.includes(sensitive));
  }

  /**
   * Process credentials and encode sensitive fields
   * @param credentials The credentials object
   */
  protected processCredentialsForStorage(credentials: Record<string, any>): Record<string, any> {
    const processedCredentials: Record<string, any> = {};
    
    Object.entries(credentials).forEach(([fieldName, fieldValue]) => {
      if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
        if (this.isSensitiveField(fieldName)) {
          logInfo(`Encoding sensitive field: ${fieldName}`);
          // If it's an object, serialize it to JSON first
          const valueToEncode = typeof fieldValue === 'object' && fieldValue !== null
            ? JSON.stringify(fieldValue)
            : String(fieldValue);
          processedCredentials[fieldName] = this.encodeSecretValue(valueToEncode);
        } else {
          processedCredentials[fieldName] = fieldValue;
        }
      }
    });
    
    return processedCredentials;
  }

  /**
   * Process credentials and decode sensitive fields
   * @param storedCredentials The stored credentials object
   */
  protected processCredentialsFromStorage(storedCredentials: Record<string, any>): Record<string, any> {
    const processedCredentials: Record<string, any> = {};
    
    Object.entries(storedCredentials).forEach(([fieldName, fieldValue]) => {
      if (this.isSensitiveField(fieldName) && typeof fieldValue === 'string') {
        logInfo(`Decoding sensitive field: ${fieldName}`);
        const decodedValue = this.decodeSecretValue(fieldValue);
        
        // Try to parse as JSON if it looks like JSON
        try {
          if (decodedValue.startsWith('{') && decodedValue.endsWith('}') || 
              decodedValue.startsWith('[') && decodedValue.endsWith(']')) {
            processedCredentials[fieldName] = JSON.parse(decodedValue);
          } else {
            processedCredentials[fieldName] = decodedValue;
          }
        } catch {
          // If JSON parsing fails, use the raw decoded value
          processedCredentials[fieldName] = decodedValue;
        }
      } else {
        processedCredentials[fieldName] = fieldValue;
      }
    });
    
    return processedCredentials;
  }
}
