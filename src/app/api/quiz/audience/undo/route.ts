import { NextResponse } from 'next/server'
import { undoLastAudience } from '@/server/db/services/quiz.service'

export async function POST() {
    try {
        const r = await undoLastAudience()
        return NextResponse.json(r)
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Undo failed' }, { status: 400 })
    }
}
