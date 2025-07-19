// TypeScript interfaces for Application Detail components

export interface Application {
  id: string
  name: string
  description: string | null
  appKey: string
  status: string
  healthCheckUrl?: string
  healthStatus?: string
  lastHealthCheckAt?: string
  consecutiveFailures?: number
  consecutiveSuccesses?: number
  createdAt: string
  user: {
    name: string | null
    email: string
  }
  environments: Environment[]
  apiKeys: ApiKey[]
  endpoints: Endpoint[]
  healthCheckLogs?: HealthCheckLog[]
}

export interface Environment {
  id: string
  name: string
  status: string
  baseDomain?: string
  healthStatus?: string
  lastHealthCheckAt?: string
  createdAt: string
  apiKeys: ApiKey[]
  security?: EnvironmentSecurity
  healthCheckLogs?: HealthCheckLog[]
}

export interface EnvironmentSecurity {
  id: string
  authenticationMethod: string
  azureSubscription?: string
  azureResourceGroup?: string
  azureKeyVault?: string
  azureApimSubscriptionKey?: string
  azureApimService?: string
  azureApimApiVersion?: string
  awsAccessKey?: string
  awsSecretKey?: string
  awsRegion?: string
  awsIamRole?: string
  awsSessionToken?: string
  gcpProjectId?: string
  gcpKeyFile?: string
  gcpServiceAccount?: string
  oauth2ClientId?: string
  oauth2ClientSecret?: string
  oauth2AuthUrl?: string
  oauth2TokenUrl?: string
  oauth2Scopes?: string
  jwtSecret?: string
  jwtAlgorithm?: string
  jwtExpiration?: number
  signaturePrivateKey?: string
  signatureKeyVersion?: string
  signatureUniqueId?: string
  signatureAlgorithm?: string
  apiKey?: string
  apiKeyHeader?: string
  bearerToken?: string
  basicAuthUsername?: string
  basicAuthPassword?: string
  rateLimitEnabled: boolean
  rateLimitRequests?: number
  rateLimitWindow?: number
  secretKeys?: string
  customHeaders?: string
}

export interface ApiKey {
  id: string
  name: string
  token: string
  status: string
  expiresAt: string | null
  lastUsed: string | null
  createdAt: string
  environment: {
    id: string
    name: string
  }
}

export interface HealthCheckLog {
  id: string
  status: string
  statusCode?: number
  responseTime?: number
  message?: string
  consecutiveFailures: number
  consecutiveSuccesses: number
  createdAt: string
  environmentId?: string
  applicationId: string
}

export interface Endpoint {
  id: string
  name: string
  path: string // Changed from url to match prisma schema
  method: string
  description?: string
  isPublic?: boolean
  pathParams?: Record<string, any> // For path parameters like {"orderId": "String"}
  queryParams?: Record<string, any> // For query parameters
  requestBody?: Record<string, any> // For request body schema
  responseBody?: Record<string, any> // For response body schema
  createdAt: string
  environmentId?: string
}
