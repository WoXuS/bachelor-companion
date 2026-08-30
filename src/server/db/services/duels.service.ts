import {badRequest, notFound} from '@/lib/errors'
import {prisma} from '../prisma'
import {withTx} from '../transaction'
import {reverseMatchTransactions, transferBetween} from './economy.service'

export function createDuel(params: {
    title: string
    stake: number
    playerAId: string
    playerBId: string
}) {
    if (params.playerAId === params.playerBId) throw badRequest('Ten sam gracz po obu stronach')
    return prisma.duel.create({data: params})
}

export function reportDuel(params: {id: string; winner: 'A' | 'B'; scoreA?: number; scoreB?: number}) {
    const {id, winner, scoreA, scoreB} = params
    return withTx(async (tx) => {
        const duel = await tx.duel.findUnique({where: {id}})
        if (!duel) throw notFound('Pojedynek nie znaleziony')
        if (duel.winnerId) throw badRequest('Pojedynek już rozstrzygnięty')

        const winnerId = winner === 'A' ? duel.playerAId : duel.playerBId
        const loserId = winner === 'A' ? duel.playerBId : duel.playerAId

        const loser = await tx.participant.findUnique({
            where: {id: loserId},
            select: {balance: true},
        })
        if (!loser) throw notFound('Uczestnik nie znaleziony')
        if (loser.balance < duel.stake) throw badRequest('Przegrany nie ma wystarczających środków')

        await tx.duel.update({
            where: {id},
            data: {winnerId, scoreA: scoreA ?? null, scoreB: scoreB ?? null, finishedAt: new Date()},
        })
        await transferBetween(
            {
                fromId: loserId,
                toId: winnerId,
                amount: duel.stake,
                reasonTo: `Wygrana 1v1 - ${duel.title}`,
                reasonFrom: `Przegrana 1v1 - ${duel.title}`,
                matchId: id,
            },
            tx,
        )
        return true
    })
}

export function revertDuel(id: string) {
    return withTx(async (tx) => {
        const duel = await tx.duel.findUnique({where: {id}})
        if (!duel) throw notFound('Pojedynek nie znaleziony')

        await reverseMatchTransactions(id, tx)
        return tx.duel.update({
            where: {id},
            data: {winnerId: null, scoreA: null, scoreB: null, finishedAt: null},
        })
    })
}

export function deleteDuel(id: string) {
    return withTx(async (tx) => {
        await reverseMatchTransactions(id, tx)
        await tx.duel.delete({where: {id}})
        return {ok: true}
    })
}

export function updateDuel(
    id: string,
    patch: {title?: string; stake?: number; playerAId?: string; playerBId?: string},
) {
    return withTx(async (tx) => {
        const duel = await tx.duel.findUnique({where: {id}})
        if (!duel) throw notFound('Pojedynek nie znaleziony')

        const started = !!duel.winnerId || duel.scoreA != null || duel.scoreB != null
        const data: {title?: string; stake?: number; playerAId?: string; playerBId?: string} = {}

        if (patch.title !== undefined) data.title = patch.title
        if (patch.stake !== undefined) data.stake = patch.stake

        if (!started) {
            if (patch.playerAId !== undefined) data.playerAId = patch.playerAId
            if (patch.playerBId !== undefined) data.playerBId = patch.playerBId

            const playerA = data.playerAId ?? duel.playerAId
            const playerB = data.playerBId ?? duel.playerBId
            if (playerA === playerB) throw badRequest('Ten sam gracz po obu stronach')
        }

        return tx.duel.update({where: {id}, data})
    })
}
