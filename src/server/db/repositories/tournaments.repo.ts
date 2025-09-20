import {prisma} from '../prisma'

export function listTournaments() {
    return prisma.tournament.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            matches: {
                where: { bracket: 'WINNERS', round: { gt: 0 } },
                orderBy: [{ round: 'asc' }, { indexInRound: 'asc' }],
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
                select: { participantId: true, participant: { select: { id: true, name: true } } },
            },
            teams: { select: { id: true, name: true } },
        },
    })
}


export function getTournament(id: string) {
    return prisma.tournament.findUnique({
        where: {id},
        include: {
            participants: {include: {participant: true}},
            teams: {include: {members: {include: {participant: true}}}},
            matches: true,
        },
    })
}


export async function deleteTournament(id: string) {
    return prisma.$transaction(async (tx) => {
        const matches = await tx.match.findMany({
            where: { tournamentId: id },
            select: { id: true },
        })
        const matchIds = matches.map((m) => m.id)

        if (matchIds.length > 0) {
            const txs = await tx.transaction.findMany({
                where: { matchId: { in: matchIds } },
                select: { id: true, participantId: true, amount: true },
            })

            if (txs.length > 0) {
                const deltaByUser = new Map<string, number>()
                for (const t of txs) {
                    deltaByUser.set(t.participantId, (deltaByUser.get(t.participantId) ?? 0) - t.amount)
                }

                const participants = await tx.participant.findMany({
                    where: { id: { in: Array.from(deltaByUser.keys()) } },
                    select: { id: true, balance: true },
                })
                const balanceById = new Map(participants.map((p) => [p.id, p.balance]))
                for (const [participantId, delta] of deltaByUser.entries()) {
                    const cur = balanceById.get(participantId) ?? 0
                    const next = cur + delta
                    if (next < 0) {
                        throw new Error(
                            `Nie można usunąć turnieju: Cofnięcie obniżyłoby saldo poniżej zera dla ${participantId}.`
                        )
                    }
                }

                for (const [participantId, delta] of deltaByUser.entries()) {
                    if (delta !== 0) {
                        await tx.participant.update({
                            where: { id: participantId },
                            data: { balance: { increment: delta } },
                        })
                    }
                }

                await tx.transaction.deleteMany({
                    where: { matchId: { in: matchIds } },
                })
            }
        }

        await tx.match.deleteMany({ where: { tournamentId: id } })
        await tx.tournamentTeamMember.deleteMany({
            where: { team: { tournamentId: id } },
        })
        await tx.tournamentTeam.deleteMany({ where: { tournamentId: id } })
        await tx.tournamentParticipant.deleteMany({ where: { tournamentId: id } })

        await tx.tournament.delete({ where: { id } })

        return { ok: true }
    })
}

export async function tournamentStarted(tournamentId: string): Promise<boolean> {
    const any = await prisma.match.findFirst({
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
    return !!any
}
