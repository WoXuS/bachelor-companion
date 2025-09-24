import { NextResponse } from 'next/server'
import { deleteShopItem } from '@/server/db/repositories/shop.repo'
import {errMsg} from "@/lib/error";

type Params = { params: { id: string } }

export async function DELETE(_: Request, { params }: Params) {
    if (!params.id) {
        return NextResponse.json({ message: 'Missing id' }, { status: 400 })
    }
    try {
        await deleteShopItem(params.id)
        return NextResponse.json({ ok: true })
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
