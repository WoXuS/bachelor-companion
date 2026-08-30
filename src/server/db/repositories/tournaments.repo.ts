import {prisma} from '../prisma'
import {withTx} from '../transaction'
import {reverseMatchTransactions} from '../services/economy.service'
import {BracketKind, TournamentType, TTournament} from '@/types/tournament'

export function listTournaments() {
    return prisma.tournament.findMany({
        orderBy: {createdAt: 'desc'},
        include: {
            matches: {
                where: {bracket: 'WINNERS', round: {gt: 0}},
                orderBy: [{round: 'asc'}, {indexInRound: 'asc'}],
                select: {
                    id: true,
                    round: true,
                    indexInRound: true,
                    nextMatchId: true,
                    participantAId: true,
                    participantBId: true,
                    winnerParticipantId: true,
                    teamAId: true,
                    teamBId: true,
                    winnerTeamId: true,
                    isBye: true,
                },
            },
            participants: {
                select: {participantId: true, participant: {select: {id: true, name: true}}},
            },
            teams: {select: {id: true, name: true}},
        },
    })
}


export async function getTournament(id: string): Promise<TTournament | null> {
    const t = await prisma.tournament.findUnique({
        where: { id },
        include: {
            participants: {
                include: {
                    participant: {
                        select: {
                            id: true,
                            name: true,
                            buffs: {
                                where: { type: 'DOUBLE_POINTS', active: true, remainingMatches: { gt: 0 } },
                                select: { remainingMatches: true },
                            },
                        },
                    },
                },
            },
            teams: {
                include: {
                    members: {
                        include: {
                            participant: {
                                select: {
                                    id: true,
                                    name: true,
                                    buffs: {
                                        where: { type: 'DOUBLE_POINTS', active: true, remainingMatches: { gt: 0 } },
                                        select: { remainingMatches: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            matches: true,
        },
    })
    if (!t) return null

    const dto: TTournament = {
        id: t.id,
        title: t.title,
        type: t.type as TournamentType,
        mainPrize: t.mainPrize,
        matchWinPrize: t.matchWinPrize,
        consolationPrize: t.consolationPrize,
        participants: t.participants.map(tp => ({
            participantId: tp.participantId,
            participant: { id: tp.participant.id, name: tp.participant.name },
        })),
        teams: t.teams.map(team => ({
            id: team.id,
            name: team.name,
            members: team.members.map(m => ({
                participant: { id: m.participant.id, name: m.participant.name },
            })),
        })),
        matches: t.matches.map(m => ({
            id: m.id,
            tournamentId:m.tournamentId,
            round: m.round,
            indexInRound: m.indexInRound,
            participantAId: m.participantAId ?? undefined,
            participantBId: m.participantBId ?? undefined,
            winnerParticipantId: m.winnerParticipantId ?? undefined,
            teamAId: m.teamAId ?? undefined,
            teamBId: m.teamBId ?? undefined,
            winnerTeamId: m.winnerTeamId ?? undefined,
            nextMatchId: m.nextMatchId ?? undefined,
            nextMatchSlot: m.nextMatchSlot ?? undefined,
            scoreA: m.scoreA ?? undefined,
            scoreB: m.scoreB ?? undefined,
            isBye: m.isBye ?? undefined,
            isPlayIn: m.isPlayIn ?? undefined,
            bestOf: m.bestOf,
            bracket: (m.bracket as BracketKind) ?? 'WINNERS',
        })),
    }

    const dpMap: Record<string, number> = {}
    for (const tp of t.participants) {
        const sum = (tp.participant.buffs ?? []).reduce((acc, b) => acc + (b.remainingMatches ?? 0), 0)
        if (sum > 0) dpMap[tp.participantId] = sum
    }
    for (const team of t.teams) {
        for (const mem of team.members) {
            const sum = (mem.participant.buffs ?? []).reduce((acc, b) => acc + (b.remainingMatches ?? 0), 0)
            if (sum > 0) dpMap[mem.participant.id] = (dpMap[mem.participant.id] ?? 0) + sum
        }
    }

    const matchIds = t.matches.map(m => m.id)
    const doubledByMatch: Record<string, boolean> = {}
    const doubledByMatchAndParticipant: Record<string, Record<string, boolean>> = {}
    if (matchIds.length > 0) {
        const doubledTxs = await prisma.transaction.findMany({
            where: { matchId: { in: matchIds }, isDoubled: true },
            select: { matchId: true, participantId: true },
        })
        for (const tx of doubledTxs) {
            if (!tx.matchId || !tx.participantId) continue
            doubledByMatch[tx.matchId] = true
            ;(doubledByMatchAndParticipant[tx.matchId] ??= {})[tx.participantId] = true
        }
    }

    return {
        ...dto,
        _dpRemainingByParticipant: dpMap,
        _payoutDoubledByMatchId: doubledByMatch,
        _payoutDoubledByMatchAndParticipant: doubledByMatchAndParticipant,
    }
}


export function deleteTournament(id: string) {
    return withTx(async (tx) => {
        const matches = await tx.match.findMany({
            where: {tournamentId: id},
            select: {id: true},
        })
        for (const match of matches) {
            await reverseMatchTransactions(match.id, tx)
        }

        await tx.match.deleteMany({where: {tournamentId: id}})
        await tx.tournamentTeamMember.deleteMany({where: {team: {tournamentId: id}}})
        await tx.tournamentTeam.deleteMany({where: {tournamentId: id}})
        await tx.tournamentParticipant.deleteMany({where: {tournamentId: id}})
        await tx.tournament.delete({where: {id}})

        return {ok: true}
    })
}

export async function tournamentStarted(tournamentId: string): Promise<boolean> {
    const startedMatch = await prisma.match.findFirst({
        where: {
            tournamentId,
            OR: [
                { winnerParticipantId: { not: null } },
                { winnerTeamId: { not: null } },
                { scoreA: { not: null } },
                { scoreB: { not: null } },
            ],
        },
        select: { id: true },
    })
    return startedMatch != null
}
