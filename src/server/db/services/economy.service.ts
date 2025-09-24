import {prisma} from '../prisma'
import {computeEffectivePrice, getShopConfig} from "@/server/db/services/pricing.service";

export async function addTransaction(participantId: string, amount: number, reason: string, matchId?: string, isDoubled?: boolean) {
    return prisma.$transaction(async (tx) => {
        const p = await tx.participant.findUnique({where: {id: participantId}, select: {balance: true}})
        if (!p) throw new Error('Participant not found')

        const next = p.balance + amount
        if (next < 0) throw new Error('Niewystarczające środki')

        const created = await tx.transaction.create({
            data: {
                participantId,
                amount,
                reason,
                balanceAfter: next,
                matchId: matchId ?? null,
                isDoubled: isDoubled ?? false
            },
        })
        await tx.participant.update({where: {id: participantId}, data: {balance: next}})
        return created
    })
}

const DP_KEY = 'double-points-4'
const DP_PACK = 4

export async function purchaseFor(participantId: string, itemId: string) {
    const [participant, item, cfg] = await Promise.all([
        prisma.participant.findUnique({where: {id: participantId}, select: {id: true, balance: true}}),
        prisma.shopItem.findUnique({where: {id: itemId}}),
        getShopConfig(),
    ])
    if (!participant) throw new Error('Participant not found')
    if (!item) throw new Error('Item not found')

    const {value: price, source, appliedPercent} = computeEffectivePrice(
        item.cost,
        {enabled: cfg.discountsEnabled, percent: cfg.discountPercent},
        {overrideEnabled: item.adjustOverrideEnabled, percent: item.adjustPercent},
        'preferred'
    )

    return prisma.$transaction(async (tx) => {
        const p = await tx.participant.findUnique({where: {id: participantId}, select: {balance: true}})
        if (!p) throw new Error('Participant not found')
        if (p.balance - price < 0) throw new Error('Niewystarczające środki')

        if (item.key === DP_KEY) {
            await tx.participantBuff.upsert({
                where: {participantId},
                create: {participantId, type: 'DOUBLE_POINTS', remainingMatches: DP_PACK, active: true},
                update: {remainingMatches: {increment: DP_PACK}, active: true, type: 'DOUBLE_POINTS'},
            })
        }

        const reasonSuffix =
            source === 'item'
                ? ` (override ${appliedPercent > 0 ? '+' : ''}${appliedPercent}%)`
                : source === 'global'
                    ? ` (${appliedPercent}% )`
                    : ''

        await tx.transaction.create({
            data: {
                participantId,
                amount: -price,
                reason: `Zakup: ${item.label}${reasonSuffix}`,
                balanceAfter: p.balance - price,
            },
        })
        await tx.participant.update({where: {id: participantId}, data: {balance: p.balance - price}})

        return true
    })
}

export async function transferBetween(
    fromId: string,
    toId: string,
    amount: number,
    reasonTo: string,
    reasonFrom ?: string | null,
    matchId?: string | null
) {
    if (fromId === toId) throw new Error('Nie można przelać samemu sobie')
    if (amount <= 0) throw new Error('Kwota musi być większa od zera')

    return prisma.$transaction(async (tx) => {
        const [from, to] = await Promise.all([
            tx.participant.findUnique({where: {id: fromId}, select: {balance: true}}),
            tx.participant.findUnique({where: {id: toId}, select: {balance: true}}),
        ])
        if (!from || !to) throw new Error('Nie znaleziono uczestników')
        if (from.balance < amount) throw new Error('Niewystarczające środki')

        const newFrom = from.balance - amount
        const newTo = to.balance + amount

        const baseReason = (reasonFrom ?? reasonTo ?? '');
        const reason = matchId ? baseReason : `TRANSAKCJA: ${baseReason}`;

        const [txOut, txIn] = await Promise.all([
            tx.transaction.create({
                data: {
                    participantId: fromId,
                    amount: -amount,
                    reason,
                    balanceAfter: newFrom,
                    counterpartyId: toId,
                    matchId: matchId
                },
            }),
            tx.transaction.create({
                data: {
                    participantId: toId,
                    amount: amount,
                    reason: matchId ? reasonTo : 'TRANSAKCJA: ' + reasonTo,
                    balanceAfter: newTo,
                    counterpartyId: fromId,
                    matchId: matchId
                },
            }),
        ])

        await Promise.all([
            tx.participant.update({where: {id: fromId}, data: {balance: newFrom}}),
            tx.participant.update({where: {id: toId}, data: {balance: newTo}}),
        ])

        return {txOut, txIn}
    })
}
