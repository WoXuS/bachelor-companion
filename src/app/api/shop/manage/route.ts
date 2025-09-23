// src/app/api/shop/manage/route.ts.ts
import { NextResponse } from 'next/server'
import { createShopItem, updateShopItem } from '@/server/db/repositories/shop.repo'

export async function POST(req: Request) {
    const { label, cost, key, category } = await req.json()
    if (!label || typeof key !== 'string' || key.trim() === '') {
        return NextResponse.json({ message: 'Invalid input' }, { status: 400 })
    }
    const nCost = Number(cost)
    if (!Number.isFinite(nCost) || nCost < 0) {
        return NextResponse.json({ message: 'Invalid cost' }, { status: 400 })
    }
    const created = await createShopItem({ label, cost: nCost, category: category ?? 'misc', key })
    return NextResponse.json(created)
}

export async function PUT(req: Request) {
    const { id, label, cost, category } = await req.json()
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 })
    const patch: any = {}
    if (typeof label === 'string') patch.label = label
    if (typeof category === 'string' || category === null) patch.category = category ?? null
    if (typeof cost !== 'undefined') {
        const nCost = Number(cost)
        if (!Number.isFinite(nCost) || nCost < 0) {
            return NextResponse.json({ message: 'Invalid cost' }, { status: 400 })
        }
        patch.cost = nCost
    }
    const updated = await updateShopItem(id, patch)
    return NextResponse.json(updated)
}
