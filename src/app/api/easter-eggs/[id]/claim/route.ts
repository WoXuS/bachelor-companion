import { NextResponse } from 'next/server'
import { claimEggById } from '@/server/db/services/easter-eggs.service'
import {errMsg} from "@/lib/error";

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { participantId } = await req.json()
        if (!participantId) return NextResponse.json({ message: 'Missing participantId' }, { status: 400 })
        const tx = await claimEggById(params.id, participantId)
        return NextResponse.json(tx)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
