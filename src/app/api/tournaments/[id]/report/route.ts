import { NextResponse } from 'next/server'
import { reportMatch } from '@/server/db/services/tournaments.service'
import {errMsg} from "@/lib/error";

type Params = { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
    const { matchId, winner, scoreA, scoreB } = await req.json()
    try {
        await reportMatch({ matchId, winner, scoreA, scoreB })
        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
