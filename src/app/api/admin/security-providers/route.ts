import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// GET /api/admin/security-providers - Get all security providers
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const providers = await prisma.securityProvider.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(providers)
  } catch (error) {
    console.error('Error fetching security providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch security providers' },
      { status: 500 }
    )
  }
}

// POST /api/admin/security-providers - Create a new security provider
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.name || !data.provider) {
      return NextResponse.json(
        { error: 'Name and provider are required' },
        { status: 400 }
      )
    }

    // Create the provider
    const provider = await prisma.securityProvider.create({
      data: {
        name: data.name,
        provider: data.provider,
        isActive: data.isActive ?? true,
        vaultUrl: data.vaultUrl,
        vaultToken: data.vaultToken,
        vaultNamespace: data.vaultNamespace,
        vaultPath: data.vaultPath,
        vaultMount: data.vaultMount,
        azureKeyVaultUrl: data.azureKeyVaultUrl,
        azureTenantId: data.azureTenantId,
        azureClientId: data.azureClientId,
        azureClientSecret: data.azureClientSecret,
        akeylessUrl: data.akeylessUrl,
        akeylessAccessId: data.akeylessAccessId,
        akeylessAccessKey: data.akeylessAccessKey,
        akeylessPath: data.akeylessPath,
      },
    })

    return NextResponse.json(provider, { status: 201 })
  } catch (error) {
    console.error('Error creating security provider:', error)
    return NextResponse.json(
      { error: 'Failed to create security provider' },
      { status: 500 }
    )
  }
}
