import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET() {
    const cfg = await prisma.shopConfig.findUnique({ where: { id: 'singleton' } })
    return NextResponse.json(cfg ?? { discountsEnabled: false, discountPercent: 20 })
}

export async function PUT(req: Request) {
    const body = await req.json().catch(() => ({}))
    const { discountsEnabled, discountPercent } = body
    const cfg = await prisma.shopConfig.upsert({
        where: { id: 'singleton' },
        update: {
            ...(typeof discountsEnabled === 'boolean' ? { discountsEnabled } : {}),
            ...(typeof discountPercent === 'number' ? { discountPercent } : {}),
        },
        create: {
            id: 'singleton',
            discountsEnabled: !!discountsEnabled,
            discountPercent: typeof discountPercent === 'number' ? discountPercent : 20,
        },
    })
    return NextResponse.json(cfg)
}
