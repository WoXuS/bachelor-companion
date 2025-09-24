import { NextResponse } from 'next/server'
import { finalizeAudienceBonus } from '@/server/db/services/quiz.service'

export async function POST() {
    try {
        const res = await finalizeAudienceBonus()
        return NextResponse.json(res)
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Failed' }, { status: 400 })
    }
}
