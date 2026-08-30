import {badRequest, notFound} from '@/lib/errors'
import {prisma} from '../prisma'
import {Tx, withTx} from '../transaction'

export function listTransactions({
    participantId,
    order = 'desc',
}: {participantId?: string; order?: 'asc' | 'desc'}) {
    return prisma.transaction.findMany({
        where: participantId ? {participantId} : undefined,
        orderBy: {createdAt: order},
        include: {
            participant: {select: {id: true, name: true, balance: true}},
            counterparty: {select: {id: true, name: true}},
        },
    })
}

async function loadForRollback(tx: Tx, id: string) {
    const original = await tx.transaction.findUnique({where: {id}})
    if (!original) throw notFound('Nie znaleziono transakcji')

    const participant = await tx.participant.findUnique({
        where: {id: original.participantId},
        select: {balance: true},
    })
    if (!participant) throw notFound('Nie znaleziono uczestnika')

    const balanceAfter = participant.balance - original.amount
    if (balanceAfter < 0) {
        throw badRequest(`Operacja obniżyłaby saldo poniżej zera dla ${original.participantId}.`)
    }
    return {original, balanceAfter}
}

export function revertTransaction(id: string) {
    return withTx(async (tx) => {
        const {original, balanceAfter} = await loadForRollback(tx, id)

        const created = await tx.transaction.create({
            data: {
                participantId: original.participantId,
                amount: -original.amount,
                reason: `REVERT: ${original.reason}`,
                balanceAfter,
            },
        })
        await tx.participant.update({
            where: {id: original.participantId},
            data: {balance: balanceAfter},
        })
        return created
    })
}

export function deleteTransaction(id: string) {
    return withTx(async (tx) => {
        const {original, balanceAfter} = await loadForRollback(tx, id)

        await tx.transaction.delete({where: {id: original.id}})
        await tx.participant.update({
            where: {id: original.participantId},
            data: {balance: balanceAfter},
        })
        return {ok: true}
    })
}
