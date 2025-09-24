import {NextResponse} from 'next/server'
import {getEggByCodeWithCounts, claimEggByCode} from '@/server/db/services/easter-eggs.service'
import {errMsg} from "@/lib/error";

export async function GET(_req: Request, {params}: { params: { code: string } }) {
    try {
        const res = await getEggByCodeWithCounts(params.code)
        if (!res) return NextResponse.json({message: 'Nie znaleziono'}, {status: 404})
        const {egg, counts} = res
        return NextResponse.json({
            id: egg.id,
            code: egg.code,
            number: egg.number,
            type: egg.type,
            active: egg.active,
            label: egg.label,
            claimedAt: egg.claimedAt,
            claimedBy: egg.claimedBy ? {id: egg.claimedBy.id, name: egg.claimedBy.name} : null,
            counts: {total: counts.total, found: counts.found, remaining: counts.remaining},
        })
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, {status: 500})
    }
}

export async function POST(req: Request, {params}: { params: { code: string } }) {
    try {
        const {participantId} = await req.json()
        if (!participantId) return NextResponse.json({message: 'Missing participantId'}, {status: 400})
        const tx = await claimEggByCode(params.code, participantId)
        return NextResponse.json(tx)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, {status: 400})
    }
}
