import {prisma} from '../prisma'

export function listTransactions({
                                     participantId,
                                     order = 'desc',
                                 }: { participantId?: string; order?: 'asc' | 'desc' }) {
    return prisma.transaction.findMany({
        where: participantId ? {participantId} : undefined,
        orderBy: {createdAt: order},
        include: {
            participant: {select: {id: true, name: true, balance: true}},
            counterparty: {select: {id: true, name: true}},
        },
    })
}


export function getTransaction(id: string) {
    return prisma.transaction.findUnique({where: {id}})
}

export async function revertTransaction(id: string) {
    return prisma.$transaction(async (tx) => {
        const original = await tx.transaction.findUnique({where: {id}})
        if (!original) throw new Error('Transaction not found')

        const p = await tx.participant.findUnique({
            where: {id: original.participantId},
            select: {balance: true},
        })
        if (!p) throw new Error('Participant not found')

        const newBalance = p.balance - original.amount
        if (newBalance < 0) {
            throw new Error('Revert would make balance negative')
        }

        const created = await tx.transaction.create({
            data: {
                participantId: original.participantId,
                amount: -original.amount,
                reason: `REVERT: ${original.reason}`,
                balanceAfter: newBalance,
            },
        })

        await tx.participant.update({
            where: {id: original.participantId},
            data: {balance: newBalance},
        })

        return created
    })
}
