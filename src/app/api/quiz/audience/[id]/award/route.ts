import { NextResponse } from 'next/server'
import { awardAudience } from '@/server/db/services/quiz.service'
import {Ctx, getParams} from "@/types/api";
import {errMsg} from "@/lib/error";

export async function POST(req: Request, ctx: Ctx<{ id: string }>) {
    const { id } = await getParams(ctx)

    try {
        const { participantId } = await req.json()
        if (!participantId) return NextResponse.json({ message: 'Missing participantId' }, { status: 400 })
        await awardAudience(id, participantId)
        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
