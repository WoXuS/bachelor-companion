import { NextResponse } from 'next/server'
import { revertTransaction } from '@/server/db/repositories/transaction.repo'
import {errMsg} from "@/lib/error";

type Params = { params: { id: string } }

export async function POST(_: Request, { params }: Params) {
    try {
        const revertTx = await revertTransaction(params.id)
        return NextResponse.json(revertTx)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
