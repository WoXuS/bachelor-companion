import { NextResponse } from 'next/server'
import { addTransaction } from '@/server/db/services/economy.service'

type Params = { params: { id: string } }

export async function POST(req: Request, { params }: Params) {
    const { amount, reason } = await req.json()

    if (typeof amount !== 'number' || !reason) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const tx = await addTransaction(params.id, amount, reason)
    return NextResponse.json(tx)
}
