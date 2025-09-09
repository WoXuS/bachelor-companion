import { prisma } from '../prisma'

export async function addTransaction(participantId: string, amount: number, reason: string) {
    const [tx] = await prisma.$transaction([
        prisma.transaction.create({ data: { participantId, amount, reason } }),
        prisma.participant.update({ where: { id: participantId }, data: { balance: { increment: amount } } }),
    ])
    return tx
}

export async function purchaseFor(participantId: string, itemId: string) {
    const item = await prisma.shopItem.findUnique({ where: { id: itemId } })
    if (!item) throw new Error('ShopItem not found')
    return addTransaction(participantId, -item.cost, `Zakup: ${item.label}`)
}
