import {NextResponse} from 'next/server'
import {prisma} from '@/server/db/prisma'
import {computeEffectivePrice, getShopConfig} from '@/server/db/services/pricing.service'

export async function GET() {
    const cfg = await getShopConfig()
    const items = await prisma.shopItem.findMany({orderBy: {label: 'asc'}})

    const payload = items.map(i => {
        const {value, source, appliedPercent} = computeEffectivePrice(
            i.cost,
            {enabled: cfg.discountsEnabled, percent: cfg.discountPercent},
            {overrideEnabled: i.adjustOverrideEnabled, percent: i.adjustPercent},
            'preferred'
        )
        return {
            ...i,
            effectiveCost: value,
            pricingSource: source,
            appliedPercent,
            discountsEnabled: cfg.discountsEnabled,
            discountPercent: cfg.discountPercent,
        }
    })
    return NextResponse.json(payload)
}

export async function POST(req: Request) {
    const data = await req.json()
    if (data.id) {
        const updated = await prisma.shopItem.update({
            where: {id: data.id},
            data: {
                cost: data.cost,
                label: data.label,
                category: data.category,
                adjustOverrideEnabled: !!data.adjustOverrideEnabled,
                adjustPercent: typeof data.adjustPercent === 'number' ? Math.round(data.adjustPercent) : 0,
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
            adjustOverrideEnabled: !!data.adjustOverrideEnabled,
            adjustPercent: typeof data.adjustPercent === 'number' ? Math.round(data.adjustPercent) : 0,
        },
    })
    return NextResponse.json(created)
}
