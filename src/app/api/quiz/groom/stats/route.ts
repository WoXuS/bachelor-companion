import { NextResponse } from 'next/server'
import { getGroomStats } from '@/server/db/services/quiz.service'

export async function GET() {
    try {
        const stats = await getGroomStats()
        return NextResponse.json(stats)
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Failed' }, { status: 500 })
    }
}
