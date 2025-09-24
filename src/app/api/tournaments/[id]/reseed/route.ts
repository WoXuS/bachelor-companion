import { NextResponse } from 'next/server'
import { reseedRound1 } from '@/server/db/services/tournaments.service'
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";

type Params = { params: { id: string } }

export async function POST(_req: Request, ctx: Ctx<{ id: string }>) {
    const { id } = await getParams(ctx)

    try {
        await reseedRound1(id)
        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
