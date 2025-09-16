import {prisma} from '../prisma'
import {addTransaction} from './economy.service'
import {TournamentTeamMember} from '@prisma/client'

function shuffle<T>(arr: T[]) {
    return arr
        .map(v => [Math.random(), v] as const)
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => v)
}

function splitInt(total: number, n: number) {
    const base = Math.floor(total / n)
    const rem = total % n
    return Array.from({length: n}, (_, i) => base + (i < rem ? 1 : 0))
}

export async function createSoloTournament(params: {
    title: string
    mainPrize: number
    matchWinPrize: number
    participantIds: string[]
}) {
    const {title, mainPrize, matchWinPrize} = params
    const ids = shuffle(params.participantIds)

    return prisma.$transaction(async (tx) => {
        const t = await tx.tournament.create({
            data: {title, type: 'SOLO', mainPrize, matchWinPrize},
        })

        await tx.tournamentParticipant.createMany({
            data: ids.map((pid) => ({tournamentId: t.id, participantId: pid})),
        })

        let round = 1
        let roundPlayers = ids.map(pid => ({participantId: pid}))
        const createdMatches: any[] = []

        while (roundPlayers.length > 1) {
            const nextRound: any[] = []
            for (let i = 0; i < roundPlayers.length; i += 2) {
                const A = roundPlayers[i]
                const B = roundPlayers[i + 1]
                if (!B) {
                    nextRound.push(A)
                    continue
                }
                const m = await tx.match.create({
                    data: {
                        tournamentId: t.id,
                        round,
                        indexInRound: i / 2,
                        participantAId: A.participantId,
                        participantBId: B.participantId,
                    },
                })
                createdMatches.push(m)
                nextRound.push({placeholderFromMatchId: m.id})
            }
            roundPlayers = nextRound
            round++
        }

        return t
    })
}

export async function createTeamTournament(params: {
    title: string
    mainPrize: number
    matchWinPrize: number
    teamA: { name: string; memberIds: string[] }
    teamB: { name: string; memberIds: string[] }
}) {
    const { title, mainPrize, teamA, teamB } = params
    return prisma.$transaction(async (tx) => {
        const t = await tx.tournament.create({
            data: { title, type: 'TEAM', mainPrize, matchWinPrize: 0 }, // 👈
        })
        const [ta, tb] = await Promise.all([
            tx.tournamentTeam.create({ data: { tournamentId: t.id, name: teamA.name } }),
            tx.tournamentTeam.create({ data: { tournamentId: t.id, name: teamB.name } }),
        ])
        await Promise.all([
            tx.tournamentTeamMember.createMany({ data: teamA.memberIds.map(id => ({ teamId: ta.id, participantId: id })) }),
            tx.tournamentTeamMember.createMany({ data: teamB.memberIds.map(id => ({ teamId: tb.id, participantId: id })) }),
        ])
        await tx.match.create({
            data: { tournamentId: t.id, round: 1, indexInRound: 0, teamAId: ta.id, teamBId: tb.id },
        })
        return t
    })
}

async function getTeamMemberIds(tx: any, teamId: string): Promise<string[]> {
    const members = await tx.tournamentTeamMember.findMany({
        where: {teamId},
        select: {participantId: true},
    })
    return members.map((m: TournamentTeamMember) => m.participantId)
}

export async function reportMatch(params: {
    matchId: string
    winner: 'A' | 'B'
    scoreA?: number
    scoreB?: number
}) {
    return prisma.$transaction(async (tx) => {
        const m = await tx.match.findUnique({ where: { id: params.matchId } })
        if (!m) throw new Error('Match not found')

        const t = await tx.tournament.findUnique({ where: { id: m.tournamentId } })
        if (!t) throw new Error('Tournament not found')

        if (m.participantAId || m.participantBId) {
            const winnerParticipantId = params.winner === 'A' ? m.participantAId! : m.participantBId!
            await tx.match.update({
                where: { id: m.id },
                data: { winnerParticipantId, scoreA: params.scoreA ?? null, scoreB: params.scoreB ?? null },
            })
            if (t.matchWinPrize > 0) {
                await addTransaction(winnerParticipantId, t.matchWinPrize, `Wygrana meczu w turnieju`)
            }
        } else {
            const winnerTeamId = params.winner === 'A' ? m.teamAId! : m.teamBId!
            await tx.match.update({
                where: { id: m.id },
                data: { winnerTeamId, scoreA: params.scoreA ?? null, scoreB: params.scoreB ?? null },
            })
        }

        const open = await tx.match.count({
            where: { tournamentId: m.tournamentId, winnerParticipantId: null, winnerTeamId: null },
        })
        if (open === 0) {
            if (t.type === 'SOLO') {
                const final = await tx.match.findFirst({
                    where: { tournamentId: t.id, winnerParticipantId: { not: null } },
                    orderBy: [{ round: 'desc' }, { indexInRound: 'asc' }],
                })
                if (!final?.winnerParticipantId) return true
                await addTransaction(final.winnerParticipantId, t.mainPrize, `Wygrana turnieju: ${t.title}`)
            } else {
                const final = await tx.match.findFirst({
                    where: { tournamentId: t.id, winnerTeamId: { not: null } },
                    orderBy: [{ round: 'desc' }, { indexInRound: 'asc' }],
                })
                if (!final?.winnerTeamId) return true
                const members = await tx.tournamentTeamMember.findMany({
                    where: { teamId: final.winnerTeamId }, select: { participantId: true },
                })
                const splits = splitInt(t.mainPrize, members.length)
                await Promise.all(members.map((m, i) =>
                    addTransaction(m.participantId, splits[i], `Wygrana turnieju (team): ${t.title}`)
                ))
            }
        }

        return true
    })
}

export function updateTournamentBasics(id: string, data: {
    title?: string;
    mainPrize?: number;
    matchWinPrize?: number
}) {
    return prisma.tournament.update({where: {id}, data})
}

function buildSingleElim(participantIds: string[]) {
    const n = participantIds.length
    const pow2 = 1 << Math.ceil(Math.log2(Math.max(2, n)))
    const byes = pow2 - n
    const seeded = [...participantIds, ...Array(byes).fill(null)] // null == BYE

    const rounds: { A: string|null, B: string|null }[][] = []
    const r1: { A: string|null, B: string|null }[] = []
    for (let i = 0; i < pow2; i += 2) r1.push({ A: seeded[i], B: seeded[i+1] })
    rounds.push(r1)

    let matches = r1.length
    while (matches > 1) {
        matches = Math.floor(matches / 2)
        rounds.push(Array.from({ length: matches }, () => ({ A: null, B: null })))
    }
    return rounds
}

export async function createSoloTournamentWithBracket(params: {
    title: string
    mainPrize: number
    matchWinPrize: number
    participantIds: string[]
}) {
    const ids = shuffle(params.participantIds)
    const grid = buildSingleElim(ids)

    return prisma.$transaction(async (tx) => {
        const t = await tx.tournament.create({
            data: { title: params.title, type: 'SOLO', mainPrize: params.mainPrize, matchWinPrize: params.matchWinPrize },
        })
        await tx.tournamentParticipant.createMany({
            data: ids.map(pid => ({ tournamentId: t.id, participantId: pid })),
        })

        const createdByRound: string[][] = []
        for (let r = 0; r < grid.length; r++) {
            const roundIds: string[] = []
            for (let i = 0; i < grid[r].length; i++) {
                const m = await tx.match.create({
                    data: { tournamentId: t.id, round: r + 1, indexInRound: i }
                })
                roundIds.push(m.id)
            }
            createdByRound.push(roundIds)
        }

        for (let r = 0; r < createdByRound.length - 1; r++) {
            for (let i = 0; i < createdByRound[r].length; i++) {
                await tx.match.update({
                    where: { id: createdByRound[r][i] },
                    data: { nextMatchId: createdByRound[r + 1][Math.floor(i / 2)] }
                })
            }
        }

        for (let i = 0; i < grid[0].length; i++) {
            const A = grid[0][i].A
            const B = grid[0][i].B
            await tx.match.update({
                where: { id: createdByRound[0][i] },
                data: {
                    participantAId: A ?? undefined,
                    participantBId: B ?? undefined,
                    isBye: A === null || B === null
                }
            })
        }

        return t
    })
}