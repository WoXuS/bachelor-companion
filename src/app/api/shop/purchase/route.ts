// src/app/api/shop/purchase/route.ts
import { NextResponse } from 'next/server'
import { purchaseFor } from '@/server/db/services/economy.service'

export async function POST(req: Request) {
    const { participantId, itemId } = await req.json()
    if (!participantId || !itemId) {
        return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }
    const tx = await purchaseFor(participantId, itemId)
    return NextResponse.json(tx)
}
