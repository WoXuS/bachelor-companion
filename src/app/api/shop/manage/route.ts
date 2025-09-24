import {NextResponse} from 'next/server'
import {createShopItem, updateShopItem} from '@/server/db/repositories/shop.repo'
import {UpdateShopItemPatch} from "@/types/shop-item";

export async function POST(req: Request) {
    const {label, cost, key, category} = await req.json()
    if (!label || typeof key !== 'string' || key.trim() === '') {
        return NextResponse.json({message: 'Invalid input'}, {status: 400})
    }
    const nCost = Number(cost)
    if (!Number.isFinite(nCost) || nCost < 0) {
        return NextResponse.json({message: 'Invalid cost'}, {status: 400})
    }
    const created = await createShopItem({label, cost: nCost, category: category ?? 'misc', key})
    return NextResponse.json(created)
}

export async function PUT(req: Request) {
    const body = await req.json() as Record<string, unknown>

    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) return NextResponse.json({ message: 'Missing id' }, { status: 400 })

    const patch: UpdateShopItemPatch = {}

    if (typeof body.label === 'string') patch.label = body.label

    if (typeof body.category === 'string') patch.category = body.category

    if (body.cost !== undefined) {
        const n = Number(body.cost)
        if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
            return NextResponse.json({ message: 'Invalid cost (must be non-negative integer)' }, { status: 400 })
        }
        patch.cost = n
    }

    if (body.adjustPercent !== undefined) {
        const n = Number(body.adjustPercent)
        if (!Number.isFinite(n) || !Number.isInteger(n)) {
            return NextResponse.json({ message: 'Invalid adjustPercent (must be integer)' }, { status: 400 })
        }
        patch.adjustPercent = n
    }

    if (typeof body.adjustOverrideEnabled === 'boolean') {
        patch.adjustOverrideEnabled = body.adjustOverrideEnabled
    }

    const updated = await updateShopItem(id, patch)
    return NextResponse.json(updated)
}
