import {NextRequest, NextResponse} from 'next/server'
import {listDuels} from '@/server/db/repositories/duels.repo'
import {createDuel} from '@/server/db/services/duels.service'
import {errMsg} from '@/lib/error'

export async function GET() {
    const rows = await listDuels()
    return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
    const body = (await req.json()) as {
        title?: unknown
        stake?: unknown
        playerAId?: unknown
        playerBId?: unknown
    }

    try {
        const d = await createDuel({
            title: typeof body.title === 'string' ? body.title : '',
            stake: Number(body.stake ?? 0),
            playerAId: String(body.playerAId ?? ''),
            playerBId: String(body.playerBId ?? ''),
        })
        return NextResponse.json(d)
    } catch (e: unknown) {
        return NextResponse.json({message: errMsg(e)}, {status: 400})
    }
}
