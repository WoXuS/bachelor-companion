import {NextResponse} from 'next/server'
import {getAudienceStandings} from '@/server/db/services/quiz.service'
import {errMsg} from "@/lib/error";

export async function GET() {
    try {
        const r = await getAudienceStandings()
        return NextResponse.json(r)
    } catch (e: unknown) {
        return NextResponse.json({message: errMsg(e)}, {status: 500})
    }
}
