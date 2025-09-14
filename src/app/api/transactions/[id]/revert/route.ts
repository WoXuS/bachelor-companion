import { NextResponse } from 'next/server'
import { revertTransaction } from '@/server/db/repositories/transaction.repo'

type Params = { params: { id: string } }

export async function POST(_: Request, { params }: Params) {
    try {
        const revertTx = await revertTransaction(params.id)
        return NextResponse.json(revertTx)
    } catch (err: any) {
        return NextResponse.json({ message: err.message }, { status: 400 })
    }
}
