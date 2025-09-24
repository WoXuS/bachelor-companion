import { NextResponse } from 'next/server'
import { revertTransaction } from '@/server/db/repositories/transaction.repo'
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";


export async function POST(req: Request, ctx: Ctx<{ id: string }>) {
    const { id } = await getParams(ctx)
    try {
        const revertTx = await revertTransaction(id)
        return NextResponse.json(revertTx)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
