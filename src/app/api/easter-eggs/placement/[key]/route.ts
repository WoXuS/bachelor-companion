import {NextRequest, NextResponse} from 'next/server'
import { getEggByPlacement } from '@/server/db/services/easter-eggs.service'
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";

export async function GET(_req: NextRequest, ctx: Ctx<{ key: string }>) {
    const { key } = await getParams(ctx)

    try {
        const egg = await getEggByPlacement(key)
        return NextResponse.json(egg ?? null)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 500 })
    }
}
