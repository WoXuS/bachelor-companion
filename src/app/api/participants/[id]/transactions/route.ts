import {NextResponse} from 'next/server'
import {addTransaction} from '@/server/db/services/economy.service'
import {Ctx, getParams} from "@/types/api";

export async function POST(req: Request, ctx: Ctx<{ id: string }>) {
    const {amount, reason} = await req.json()
    const {id} = await getParams(ctx)
    if (typeof amount !== 'number' || !reason) {
        return NextResponse.json({error: 'Invalid input'}, {status: 400})
    }

    const tx = await addTransaction(id, amount, reason)
    return NextResponse.json(tx)
}
