import { NextResponse } from 'next/server'
import { reseedRound1 } from '@/server/db/services/tournaments.service'

type Params = { params: { id: string } }

export async function POST(_: Request, { params }: Params) {
    try {
        await reseedRound1(params.id)
        return NextResponse.json({ ok: true })
    } catch (e: any) {
        return NextResponse.json({ message: e.message }, { status: 400 })
    }
}
