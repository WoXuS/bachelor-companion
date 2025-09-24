import { NextResponse } from 'next/server'
import { awardAudience } from '@/server/db/services/quiz.service'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { participantId } = await req.json()
        if (!participantId) return NextResponse.json({ message: 'Missing participantId' }, { status: 400 })
        await awardAudience(params.id, participantId)
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Failed' }, { status: 400 })
    }
}
