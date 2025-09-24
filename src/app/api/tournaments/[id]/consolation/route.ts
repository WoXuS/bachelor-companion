import {NextResponse} from 'next/server'
import {createConsolationBracket} from '@/server/db/services/tournaments.service'
import {errMsg} from "@/lib/error";

type Params = { params: { id: string } }

export async function POST(_: Request, {params}: Params) {
    try {
        await createConsolationBracket(params.id)
        return NextResponse.json({ok: true})
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, {status: 400})
    }
}
