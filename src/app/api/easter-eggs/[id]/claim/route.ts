import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

const REWARD = 50

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { participantId } = await req.json()
        if (!participantId) return NextResponse.json({ message: 'Missing participantId' }, { status: 400 })

        const res = await prisma.$transaction(async (tx) => {
            const egg = await tx.easterEgg.findUnique({ where: { id: params.id } })
            if (!egg) throw new Error('Nie znaleziono')
            if (!egg.active) throw new Error('Ten easter egg jest nieaktywny')

            const totals = await tx.easterEgg.count({ where: { type: egg.type as any } })
            const foundSoFar = await tx.easterEgg.count({
                where: { type: egg.type as any, claimedAt: { not: null } },
            })
            const ordinal = foundSoFar + 1
            const reason =
                `${egg.type === 'PHYSICAL' ? 'fizyczny' : 'wirtualny'} easter egg ${ordinal}/${totals}`

            const p = await tx.participant.findUnique({ where: { id: participantId }, select: { balance: true } })
            if (!p) throw new Error('Uczestnik nie znaleziony')

            const next = p.balance + REWARD
            const trx = await tx.transaction.create({
                data: {
                    participantId,
                    amount: REWARD,
                    reason,
                    balanceAfter: next,
                    matchId: null,
                    isDoubled: false,
                },
            })
            await tx.participant.update({ where: { id: participantId }, data: { balance: next } })

            await tx.easterEgg.update({
                where: { id: egg.id },
                data: { active: false, claimedById: participantId, claimedAt: new Date() },
            })

            return { trx, reason }
        })

        return NextResponse.json(res)
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Claim failed' }, { status: 400 })
    }
}
