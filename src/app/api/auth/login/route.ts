import { NextResponse } from 'next/server'
import { setAdmin } from '@/lib/session'

export async function POST(req: Request) {
    const { password } = await req.json()
    if (!password || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ ok:false }, { status: 401 })
    setAdmin()
    return NextResponse.json({ ok:true })
}
