import {NextRequest, NextResponse} from 'next/server'
import { reactivateEgg } from '@/server/db/services/easter-eggs.service'
import {isAdminFromRequest} from '@/lib/session'
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";

export async function POST(req: NextRequest, ctx: Ctx<{ id: string }>) {
    try {
        const { id } = await getParams(ctx)
        if (!isAdminFromRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const res = await reactivateEgg(id)
        return NextResponse.json(res)
    } catch (e) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
