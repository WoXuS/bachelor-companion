import {NextResponse} from 'next/server'
import {prisma} from '@/server/db/prisma'
import { listShopItems } from '@/server/db/repositories/shop.repo'

export async function GET() {
    const items = await listShopItems()
    return NextResponse.json(items)
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
