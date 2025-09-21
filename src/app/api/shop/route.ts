import {NextResponse} from 'next/server'
import {prisma} from '@/server/db/prisma'
import {
    applyDiscountRounded,
    getShopConfig
} from "@/server/db/services/pricing.service";

export async function GET() {
    const cfg = await getShopConfig()
    const items = await prisma.shopItem.findMany({orderBy: {label: 'asc'}})
    const payload = items.map(i => ({
        ...i,
        effectiveCost: applyDiscountRounded(i.cost, cfg.discountsEnabled, cfg.discountPercent, {mode: 'preferred'})
        ,
        discountsEnabled: cfg.discountsEnabled,
        discountPercent: cfg.discountPercent,
    }))
    return NextResponse.json(payload)
}

export async function POST(req: Request) {
    const data = await req.json()
    if (data.id) {
        const updated = await prisma.shopItem.update({
            where: {id: data.id},
            data: {
                cost: data.cost,
                label: data.label
            },

        })
        return NextResponse.json(updated)
    }
    const created = await prisma.shopItem.create({
        data: {
            key: data.key,
            cost: data.cost,
            label: data.label,
            category: data.category,
        },
    })
    return NextResponse.json(created)
}
