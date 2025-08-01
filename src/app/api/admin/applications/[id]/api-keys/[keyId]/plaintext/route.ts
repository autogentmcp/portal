import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getPlaintextApiKey } from '@/lib/api-keys'
import { prisma } from '@/lib/prisma'

// GET /api/admin/applications/[id]/api-keys/[keyId]/plaintext - Get plaintext API key from vault
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // In Next.js 14+, we need to await params before accessing its properties
    const { id: applicationId, keyId } = await params
    
    // Check if the API key exists and belongs to the application
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        applicationId
      }
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Get the plaintext API key from the vault
    const plaintextKey = await getPlaintextApiKey(applicationId, keyId)

    if (!plaintextKey) {
      return NextResponse.json({ error: 'API key not found in vault' }, { status: 404 })
    }

    // Return the plaintext API key
    return NextResponse.json({ plaintextKey })
  } catch (error) {
    console.error('Error retrieving plaintext API key')
    return NextResponse.json(
      { error: 'Failed to retrieve API key' },
      { status: 500 }
    )
  }
}
