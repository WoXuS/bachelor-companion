import { NextResponse } from 'next/server'
import { getAudienceStandings } from '@/server/db/services/quiz.service'

export async function GET() {
    try {
        const r = await getAudienceStandings()
        return NextResponse.json(r)
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Failed' }, { status: 500 })
    }
}
