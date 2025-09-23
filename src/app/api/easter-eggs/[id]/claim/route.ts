import { NextResponse } from 'next/server'
import { claimEggById } from '@/server/db/services/easter-eggs.service'

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { participantId } = await req.json()
        if (!participantId) return NextResponse.json({ message: 'Missing participantId' }, { status: 400 })
        const tx = await claimEggById(params.id, participantId)
        return NextResponse.json(tx)
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Claim failed' }, { status: 400 })
    }
}
