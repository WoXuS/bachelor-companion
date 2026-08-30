import {Tx, withTx} from '../transaction'
import {reverseMatchTransactions} from './economy.service'

async function restoreDoublePointsUsage(tx: Tx, matchId: string) {
    const usages = await tx.participantBuffUsage.findMany({
        where: {matchId},
        select: {participantId: true, used: true},
    })
    if (usages.length === 0) return

    const usedByParticipant = new Map<string, number>()
    for (const usage of usages) {
        usedByParticipant.set(
            usage.participantId,
            (usedByParticipant.get(usage.participantId) ?? 0) + usage.used,
        )
    }

    for (const [participantId, used] of usedByParticipant) {
        await tx.participantBuff.updateMany({
            where: {participantId, type: 'DOUBLE_POINTS'},
            data: {remainingMatches: {increment: used}, active: true},
        })
    }

    await tx.participantBuffUsage.deleteMany({where: {matchId}})
}

async function clearDownstreamSlot(tx: Tx, matchId: string) {
    const current = await tx.match.findUnique({
        where: {id: matchId},
        select: {nextMatchId: true, nextMatchSlot: true},
    })
    if (!current?.nextMatchId || !current.nextMatchSlot) return

    const next = await tx.match.findUnique({
        where: {id: current.nextMatchId},
        select: {id: true, winnerParticipantId: true, scoreA: true, scoreB: true},
    })
    if (!next) return

    const started = !!next.winnerParticipantId || next.scoreA != null || next.scoreB != null
    if (started) return

    await tx.match.update({
        where: {id: next.id},
        data:
            current.nextMatchSlot === 'A'
                ? {participantAId: null, teamAId: null}
                : {participantBId: null, teamBId: null},
    })
}

export function revertMatch(matchId: string) {
    return withTx(async (tx) => {
        await reverseMatchTransactions(matchId, tx)
        await restoreDoublePointsUsage(tx, matchId)

        const match = await tx.match.update({
            where: {id: matchId},
            data: {winnerParticipantId: null, winnerTeamId: null, scoreA: null, scoreB: null},
        })
        await clearDownstreamSlot(tx, matchId)
        return match
    })
}
