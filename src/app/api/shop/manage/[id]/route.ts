import { NextResponse } from 'next/server'
import { deleteShopItem } from '@/server/db/repositories/shop.repo'

type Params = { params: { id: string } }

export async function DELETE(_: Request, { params }: Params) {
    if (!params.id) {
        return NextResponse.json({ message: 'Missing id' }, { status: 400 })
    }
    try {
        await deleteShopItem(params.id)
        return NextResponse.json({ ok: true })
    } catch (err: any) {
        return NextResponse.json({ message: err.message || 'Delete failed' }, { status: 400 })
    }
}
