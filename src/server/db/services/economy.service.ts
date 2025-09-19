import {prisma} from '../prisma'
import {getShopItem} from '../repositories/shop.repo'

export async function addTransaction(participantId: string, amount: number, reason: string, matchId?: string) {
    return prisma.$transaction(async (tx) => {
        const p = await tx.participant.findUnique({where: {id: participantId}, select: {balance: true}})
        if (!p) throw new Error('Participant not found')

        const newBalance = p.balance + amount

        const created = await tx.transaction.create({
            data: {participantId, amount, reason, balanceAfter: newBalance, matchId: matchId ?? null},
        })

        await tx.participant.update({
            where: {id: participantId},
            data: {balance: newBalance},
        })

        return created
    })
}

export async function purchaseFor(participantId: string, itemId: string) {
    const item = await getShopItem(itemId)
    if (!item) throw new Error('Item not found')

    const participant = await prisma.participant.findUnique({where: {id: participantId}, select: {balance: true}})
    if (!participant) throw new Error('Participant not found')
    if (participant.balance < item.cost) throw new Error('Insufficient funds')

    return addTransaction(participantId, -item.cost, `Zakup: ${item.label}`)
}

export async function transferBetween(
    fromId: string,
    toId: string,
    amount: number,
    reason: string
) {
    if (fromId === toId) throw new Error('Nie można przelać samemu sobie')
    if (amount <= 0) throw new Error('Kwota musi być większa od zera')

    return prisma.$transaction(async (tx) => {
        const [from, to] = await Promise.all([
            tx.participant.findUnique({ where: { id: fromId }, select: { balance: true } }),
            tx.participant.findUnique({ where: { id: toId }, select: { balance: true } }),
        ])
        if (!from || !to) throw new Error('Nie znaleziono uczestników')
        if (from.balance < amount) throw new Error('Niewystarczające środki')

        const newFrom = from.balance - amount
        const newTo   = to.balance + amount

        const [txOut, txIn] = await Promise.all([
            tx.transaction.create({
                data: { participantId: fromId, amount: -amount, reason: `TRANSAKCJA: ${reason}`, balanceAfter: newFrom, counterpartyId: toId },
            }),
            tx.transaction.create({
                data: { participantId: toId, amount: amount, reason: `TRANSAKCJA: ${reason}`, balanceAfter: newTo, counterpartyId: fromId },
            }),
        ])

        await Promise.all([
            tx.participant.update({ where: { id: fromId }, data: { balance: newFrom } }),
            tx.participant.update({ where: { id: toId }, data: { balance: newTo } }),
        ])

        return { txOut, txIn }
    })
}
