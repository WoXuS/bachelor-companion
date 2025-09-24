import {NextResponse} from 'next/server'
import {getEggByIdWithCounts} from '@/server/db/services/easter-eggs.service'
import {errMsg} from "@/lib/error";

export async function GET(_req: Request, {params}: { params: { id: string } }) {
    try {
        const res = await getEggByIdWithCounts(params.id)
        if (!res) return NextResponse.json({message: 'Nie znaleziono'}, {status: 404})
        const {egg, counts} = res
        return NextResponse.json({
            id: egg.id,
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
