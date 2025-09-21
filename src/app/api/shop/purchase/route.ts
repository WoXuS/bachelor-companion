import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'
import {applyDiscountRound20, getShopConfig} from "@/server/db/services/pricing.service";

export async function POST(req: Request) {
    try {
        const { participantId, itemId } = await req.json()
        if (!participantId || !itemId) {
            return NextResponse.json({ error: 'Missing params' }, { status: 400 })
        }

        const [p, item, cfg] = await Promise.all([
            prisma.participant.findUnique({ where: { id: participantId } }),
            prisma.shopItem.findUnique({ where: { id: itemId } }),
            getShopConfig(),
        ])
        if (!p || !item) return NextResponse.json({ message: 'Nie znaleziono' }, { status: 404 })

        const price = applyDiscountRound20(item.cost, cfg.discountsEnabled, cfg.discountPercent)
        if (p.balance < price) return NextResponse.json({ message: 'Brak środków' }, { status: 400 })

        const txRes = await prisma.$transaction(async (tx) => {
            await tx.participant.update({
                where: { id: p.id },
                data: { balance: { decrement: price } },
            })
            const txRow = await tx.transaction.create({
                data: {
                    participantId: p.id,
                    amount: -price,
                    reason: `Zakup: ${item.label}${cfg.discountsEnabled ? ` (-${cfg.discountPercent}%)` : ''}`,
                },
            })

            if (item.key === 'double-points-4') {
                await tx.participantBuff.create({
                    data: { participantId: p.id, type: 'DOUBLE_POINTS', remainingMatches: 4, active: true },
                })
            }

            return txRow
        })

        return NextResponse.json(txRes)
    } catch (err: any) {
        return NextResponse.json({ message: err?.message ?? 'Purchase failed' }, { status: 400 })
    }
}
