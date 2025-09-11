import { NextResponse } from 'next/server'
import { isAdminServer } from '@/lib/session'

export function GET() {
    return NextResponse.json({ isAdmin: isAdminServer() })
}
