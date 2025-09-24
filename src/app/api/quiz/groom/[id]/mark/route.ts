import {NextResponse} from 'next/server'
import {markGroom} from '@/server/db/services/quiz.service'
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";

export async function POST(req: Request, ctx: Ctx<{ id: string }>) {
    const {id} = await getParams(ctx)
    try {
        const {correct} = await req.json()
        if (typeof correct !== 'boolean') return NextResponse.json({message: 'Missing correct'}, {status: 400})
        await markGroom(id, correct)
        return NextResponse.json({ok: true})
    } catch (e: unknown) {
        return NextResponse.json({message: errMsg(e)}, {status: 400})
    }
}
