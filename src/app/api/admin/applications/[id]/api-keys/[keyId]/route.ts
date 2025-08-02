import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { deleteApiKey } from '@/lib/api-keys'

// DELETE /api/admin/applications/[id]/api-keys/[keyId] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // In Next.js 15+, params is a Promise, so we need to await it
    const { keyId } = await params

    // Use our secure deleteApiKey function that also removes from vault
    await deleteApiKey(keyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting API key')
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
