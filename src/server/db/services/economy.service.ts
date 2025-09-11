// src/server/db/services/economy.service.ts
import {prisma} from '../prisma'
import {getShopItem} from '../repositories/shop.repo'

export async function addTransaction(participantId: string, amount: number, reason: string) {
    const [tx] = await prisma.$transaction([
        prisma.transaction.create({data: {participantId, amount, reason}}),
        prisma.participant.update({
            where: {id: participantId},
            data: {balance: {increment: amount}},
        }),
    ])
    return tx
}

export async function purchaseFor(participantId: string, itemId: string) {
    const item = await getShopItem(itemId)
    if (!item) throw new Error('Item not found')
    return addTransaction(participantId, -item.cost, `Zakup: ${item.label}`)
}
