import { NextResponse } from 'next/server'
import { markGroom } from '@/server/db/services/quiz.service'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { correct } = await req.json()
        if (typeof correct !== 'boolean') return NextResponse.json({ message: 'Missing correct' }, { status: 400 })
        await markGroom(params.id, correct)
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Failed' }, { status: 400 })
    }
}
