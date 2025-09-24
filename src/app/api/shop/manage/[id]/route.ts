import { NextResponse } from 'next/server'
import { deleteShopItem } from '@/server/db/repositories/shop.repo'
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";


export async function DELETE(_req: Request, ctx: Ctx<{ id: string }>) {
    const { id } = await getParams(ctx)

    if (!id) {
        return NextResponse.json({ message: 'Missing id' }, { status: 400 })
    }
    try {
        await deleteShopItem(id)
        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
