import {NextRequest, NextResponse} from 'next/server'
import {isAdminFromRequest} from '@/lib/session'

export function GET(req: NextRequest) {
    return NextResponse.json({ isAdmin: isAdminFromRequest(req) })
}
