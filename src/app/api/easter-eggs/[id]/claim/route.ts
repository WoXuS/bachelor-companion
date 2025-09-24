import { NextResponse } from 'next/server'
import { claimEggById } from '@/server/db/services/easter-eggs.service'
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";

export async function POST(req: Request, ctx: Ctx<{ id: string }>) {
    try {
        const { id } = await getParams(ctx)
        const { participantId } = await req.json()
        if (!participantId) return NextResponse.json({ message: 'Missing participantId' }, { status: 400 })
        const tx = await claimEggById(id, participantId)
        return NextResponse.json(tx)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
