import { NextResponse } from 'next/server'
import { transferBetween } from '@/server/db/services/economy.service'

export async function POST(req: Request) {
    try {
        const { fromId, toId, amount, reason } = await req.json()
        const n = Number(amount)
        if (!fromId || !toId || !reason || !Number.isFinite(n))
            return NextResponse.json({ message: 'Niepoprawne dane' }, { status: 400 })

        const data = await transferBetween(fromId, toId, n, reason)
        return NextResponse.json(data)
    } catch (err: any) {
        return NextResponse.json({ message: err.message || 'Transfer failed' }, { status: 400 })
    }
}
