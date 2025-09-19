import {prisma} from '../prisma'
import {addTransaction} from './economy.service'
import {Prisma, TournamentTeamMember} from '@prisma/client'
import {NextResponse} from "next/server";

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


export async function createTeamTournament(params: {
    title: string
    mainPrize: number
    matchWinPrize: number
    teamA: { name: string; memberIds: string[] }
    teamB: { name: string; memberIds: string[] }
}) {
    const {title, mainPrize, teamA, teamB} = params
    return prisma.$transaction(async (tx) => {
        const t = await tx.tournament.create({
            data: {title, type: 'TEAM', mainPrize, matchWinPrize: 0},
        })
        const [ta, tb] = await Promise.all([
            tx.tournamentTeam.create({data: {tournamentId: t.id, name: teamA.name}}),
            tx.tournamentTeam.create({data: {tournamentId: t.id, name: teamB.name}}),
        ])
        await Promise.all([
            tx.tournamentTeamMember.createMany({data: teamA.memberIds.map(id => ({teamId: ta.id, participantId: id}))}),
            tx.tournamentTeamMember.createMany({data: teamB.memberIds.map(id => ({teamId: tb.id, participantId: id}))}),
        ])
        await tx.match.create({
            data: {tournamentId: t.id, round: 1, indexInRound: 0, teamAId: ta.id, teamBId: tb.id},
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

async function isWinnersPlayInMatch(
    tx: Prisma.TransactionClient,
    tournamentId: string,
    round: number
): Promise<boolean> {
    const minRoundRow = await tx.match.findFirst({
        where: {tournamentId, bracket: 'WINNERS'},
        orderBy: {round: 'asc'},
        select: {round: true},
    })
    if (!minRoundRow) return false

    const minR = minRoundRow.round
    const anyByeInMin = await tx.match.count({
        where: {tournamentId, bracket: 'WINNERS', round: minR, isBye: true},
    })

    if (anyByeInMin === 0) return false

    return round === minR
}

export async function reportMatch(params: {
    matchId: string
    winner: 'A' | 'B'
    scoreA?: number
    scoreB?: number
}) {
    return prisma.$transaction(async (tx) => {
            const m = await tx.match.findUnique({where: {id: params.matchId}})
            if (!m) throw new Error('Mecz nie znaleziony')

            const t = await tx.tournament.findUnique({where: {id: m.tournamentId}})
            if (!t) throw new Error('Turniej nie znaleziony')

            const isSolo = !!(m.participantAId || m.participantBId)

            if (isSolo) {
                const winnerParticipantId = params.winner === 'A' ? m.participantAId : m.participantBId
                if (!winnerParticipantId) throw new Error('Brak uczestnika po wybranej stronie')

                await tx.match.update({
                    where: {id: m.id},
                    data: {winnerParticipantId, scoreA: params.scoreA ?? null, scoreB: params.scoreB ?? null},
                })
                if (t.matchWinPrize > 0) {
                    const isFinal = !m.nextMatchId
                    const isPlayIn = m.bracket === 'LOSERS' ? !!m.isPlayIn
                        : (await isWinnersPlayInMatch(tx, m.tournamentId, m.round))

                    const shouldPayWinPrize = !(isPlayIn || isFinal)
                    if (shouldPayWinPrize) {
                        await addTransaction(
                            winnerParticipantId,
                            t.matchWinPrize,
                            `Wygrana meczu (${m.bracket === 'WINNERS' ? 'drab. wygranych' : 'drab. przegranych'}) – ${t.title}`,
                            m.id
                        )
                    }
                }

                if (m.nextMatchId && m.nextMatchSlot) {
                    await tx.match.update({
                        where: {id: m.nextMatchId},
                        data: m.nextMatchSlot === 'A' ? {participantAId: winnerParticipantId} : {participantBId: winnerParticipantId},
                    })
                }
            } else {
                const winnerTeamId = params.winner === 'A' ? m.teamAId : m.teamBId
                if (!winnerTeamId) throw new Error('Brak zespołu po wybranej stronie')
                await tx.match.update({
                    where: {id: m.id},
                    data: {winnerTeamId, scoreA: params.scoreA ?? null, scoreB: params.scoreB ?? null},
                })
            }

            if (m.bracket === 'WINNERS') {
                const openWinners = await tx.match.count({
                    where: {
                        tournamentId: m.tournamentId,
                        bracket: 'WINNERS',
                        winnerParticipantId: null,
                        winnerTeamId: null
                    },
                })
                if (openWinners === 0) {
                    if (t.type === 'SOLO') {
                        const final = await tx.match.findFirst({
                            where: {tournamentId: t.id, bracket: 'WINNERS', winnerParticipantId: {not: null}},
                            orderBy: [{round: 'desc'}, {indexInRound: 'asc'}],
                        })
                        if (final?.winnerParticipantId) {
                            await addTransaction(final.winnerParticipantId, t.mainPrize, `Wygrana turnieju: ${t.title}`, final.id)
                        }
                    } else {
                        const final = await tx.match.findFirst({
                            where: {tournamentId: t.id, bracket: 'WINNERS', winnerTeamId: {not: null}},
                            orderBy: [{round: 'desc'}, {indexInRound: 'asc'}],
                        })
                        if (final?.winnerTeamId) {
                            const members = await tx.tournamentTeamMember.findMany({
                                where: {teamId: final.winnerTeamId}, select: {participantId: true},
                            })
                            const splits = splitInt(t.mainPrize, members.length)
                            await Promise.all(members.map((m, i) => addTransaction(m.participantId, splits[i], `Wygrana turnieju: ${t.title}`)))
                        }
                    }
                }
            } else if (m.bracket === 'LOSERS' && t.type === 'SOLO') {
                const openLosers = await tx.match.count({
                    where: {tournamentId: m.tournamentId, bracket: 'LOSERS', winnerParticipantId: null},
                })
                if (openLosers === 0 && t.consolationPrize > 0) {
                    const final = await tx.match.findFirst({
                        where: {tournamentId: t.id, bracket: 'LOSERS', winnerParticipantId: {not: null}},
                        orderBy: [{round: 'desc'}, {indexInRound: 'asc'}],
                    })
                    if (final?.winnerParticipantId) {
                        await addTransaction(
                            final.winnerParticipantId,
                            t.consolationPrize,
                            `Wygrana drabinki przegranych, turniej: ${t.title}`,
                            final.id
                        )
                    }
                }
            }
            return true
        }
    )
}


export function updateTournamentBasics(id: string, data: {
    title?: string;
    mainPrize?: number;
    matchWinPrize?: number;
    consolationPrize?: number;
}) {
    return prisma.tournament.update({where: {id}, data})
}

type SeedPair = { A: string | null; B: string | null }

function buildSingleElim(participantIds: string[]): SeedPair[][] {
    const n = participantIds.length
    const pow2 = 1 << Math.ceil(Math.log2(Math.max(2, n)))
    const byes = pow2 - n
    const seeded = [...participantIds, ...Array(byes).fill(null)]
    const rounds: SeedPair[][] = []
    const r1: SeedPair[] = []
    for (let i = 0; i < pow2; i += 2) r1.push({A: seeded[i], B: seeded[i + 1]})
    rounds.push(r1)

    let matches = r1.length
    while (matches > 1) {
        matches = Math.floor(matches / 2)
        rounds.push(Array.from({length: matches}, () => ({A: null, B: null})))
    }
    return rounds
}

async function autoAdvanceByes(tournamentId: string) {
    const r1 = await prisma.match.findMany({
        where: {tournamentId, round: 1, isBye: true},
        select: {id: true, participantAId: true, participantBId: true, nextMatchId: true, nextMatchSlot: true},
    })
    for (const m of r1) {
        const winnerPid = m.participantAId ?? m.participantBId
        if (!winnerPid) continue
        await prisma.match.update({
            where: {id: m.id},
            data: {winnerParticipantId: winnerPid, scoreA: 1, scoreB: 0},
        })
        if (m.nextMatchId && m.nextMatchSlot) {
            await prisma.match.update({
                where: {id: m.nextMatchId},
                data:
                    m.nextMatchSlot === 'A'
                        ? {participantAId: winnerPid}
                        : {participantBId: winnerPid},
            })
        }
    }
}

type Entrant =
    | { kind: 'player'; id: string }
    | { kind: 'fromMatch'; matchId: string; winnerId?: string }

function bracketOrder(n: number): number[] {
    if (n === 1) return [1]
    const half = bracketOrder(n / 2)
    const mirror = half.map(s => n + 1 - s)
    const out: number[] = []
    for (let i = 0; i < half.length; i++) {
        out.push(half[i], mirror[i])
    }
    return out
}

export async function createSoloTournamentCompact(params: {
    title: string
    mainPrize: number
    matchWinPrize: number
    consolationPrize: number
    participantIds: string[]
}) {
    const ids = [...params.participantIds]

    return prisma.$transaction(async (tx) => {
        const t = await tx.tournament.create({
            data: {
                title: params.title,
                type: 'SOLO',
                mainPrize: params.mainPrize,
                matchWinPrize: params.matchWinPrize,
                consolationPrize: params.consolationPrize,
            },
        })

        await tx.tournamentParticipant.createMany({
            data: ids.map((pid) => ({tournamentId: t.id, participantId: pid})),
        })

        const n = ids.length
        const pow2Up = 1 << Math.ceil(Math.log2(Math.max(2, n)))
        const pairsCountR0 = pow2Up / 2
        const order = bracketOrder(pow2Up)

        const ranked = await tx.participant.findMany({
            where: {id: {in: ids}, active: true},
            select: {id: true, balance: true},
            orderBy: {balance: 'desc'},
        })
        const rankedIds = [
            ...ranked.map(r => r.id),
            ...ids.filter(id => !ranked.some(r => r.id === id)),
        ]

        const seedToPid: (string | null)[] = Array(pow2Up).fill(null)
        for (let s = 1; s <= n; s++) {
            seedToPid[s - 1] = rankedIds[s - 1]
        }

        const slotsR0: (string | null)[] = order.map(seedNo => seedToPid[seedNo - 1] ?? null)

        const roundIds: string[][] = []
        let round = 1

        const r0Ids: string[] = []
        const entrantsAfterR0: Entrant[] = []

        for (let i = 0; i < pairsCountR0; i++) {
            const pidA = slotsR0[2 * i]
            const pidB = slotsR0[2 * i + 1]

            const match = await tx.match.create({
                data: {
                    tournamentId: t.id,
                    round,
                    indexInRound: i,
                    participantAId: pidA,
                    participantBId: pidB,
                    isBye: !pidA || !pidB,
                    bracket: 'WINNERS',
                    bestOf: 1,
                },
            })
            r0Ids.push(match.id)

            if ((pidA && !pidB) || (!pidA && pidB)) {
                const winnerId = pidA ?? pidB!
                await tx.match.update({
                    where: {id: match.id},
                    data: {winnerParticipantId: winnerId, scoreA: pidA ? 1 : 0, scoreB: pidB ? 1 : 0},
                })
                entrantsAfterR0.push({kind: 'fromMatch', matchId: match.id, winnerId})
            } else {
                entrantsAfterR0.push({kind: 'fromMatch', matchId: match.id})
            }
        }

        roundIds.push(r0Ids)
        round++

        let entrants: Entrant[] = entrantsAfterR0
        while (entrants.length > 1) {
            const thisRound: string[] = []
            const next: Entrant[] = []

            for (let i = 0; i < entrants.length; i += 2) {
                const A = entrants[i]
                const B = entrants[i + 1]
                const pidA = A?.kind === 'player' ? A.id : A?.winnerId ?? null
                const pidB = B?.kind === 'player' ? B.id : B?.winnerId ?? null

                const match = await tx.match.create({
                    data: {
                        tournamentId: t.id,
                        round,
                        indexInRound: thisRound.length,
                        participantAId: pidA,
                        participantBId: pidB,
                        isBye: false,
                        bracket: 'WINNERS',
                        bestOf: 1,
                    },
                })
                thisRound.push(match.id)

                if (A?.kind === 'fromMatch') {
                    await tx.match.update({
                        where: {id: A.matchId},
                        data: {nextMatchId: match.id, nextMatchSlot: 'A'}
                    })
                }
                if (B?.kind === 'fromMatch') {
                    await tx.match.update({
                        where: {id: B.matchId},
                        data: {nextMatchId: match.id, nextMatchSlot: 'B'}
                    })
                }

                next.push({kind: 'fromMatch', matchId: match.id})
            }

            roundIds.push(thisRound)
            entrants = next
            round++
        }

        const maxRound = roundIds.length
        await Promise.all(
            roundIds.flatMap((idsInRound, rIdx) => {
                const r = rIdx + 1
                const bo = r === maxRound ? 5 : r <= 2 ? 1 : 3
                return idsInRound.map((id) => tx.match.update({where: {id}, data: {bestOf: bo}}))
            })
        )

        return t
    })
}


export async function createConsolationBracket(
    tournamentId: string,
    defaultBestOf: 1 | 3 | 5 = 1
) {
    return prisma.$transaction(async (tx) => {
        const t = await tx.tournament.findUnique({where: {id: tournamentId}})
        if (!t) throw new Error('Turniej nie znaleziony')
        if (t.type !== 'SOLO') throw new Error('Drabinka przegranych tylko dla turniejów SOLO')

        const exists = await tx.match.count({where: {tournamentId, bracket: 'LOSERS'}})
        if (exists > 0) throw new Error('Drabinka przegranych już istnieje')

        const wins = await tx.match.findMany({
            where: {tournamentId, bracket: 'WINNERS'},
            orderBy: [{round: 'asc'}, {indexInRound: 'asc'}],
            select: {
                id: true, round: true, isBye: true,
                participantAId: true, participantBId: true, winnerParticipantId: true
            }
        })
        if (!wins.length) throw new Error('Brak meczów w drabince wygranych')

        const byRound = new Map<number, typeof wins>()
        for (const m of wins) {
            const arr = byRound.get(m.round) ?? []
            arr.push(m);
            byRound.set(m.round, arr)
        }

        const minWinnersRound = Math.min(...wins.map(m => m.round))
        const winnersR0 = byRound.get(minWinnersRound) ?? []

        let firstNoByeRound: number | null = null
        for (const [r, ms] of [...byRound.entries()].sort((a, b) => a[0] - b[0])) {
            if (!ms.some(m => m.isBye)) {
                firstNoByeRound = r;
                break
            }
        }
        if (!firstNoByeRound) throw new Error('Nie znaleziono rundy drabinki wygranych bez auto-awansów')

        const winnersMain = byRound.get(firstNoByeRound)!

        if (!winnersMain.every(m => m.winnerParticipantId)) {
            throw new Error(`Najpierw zakończ wszystkie mecze w rundzie ${firstNoByeRound} (WINNERS)`)
        }

        const losers: string[] = []
        const pushLoser = (m: typeof wins[number]) => {
            const A = m.participantAId, B = m.participantBId, W = m.winnerParticipantId
            if (!A || !B || !W) return
            losers.push(W === A ? B : A)
        }
        for (const m of winnersR0) if (!m.isBye && m.winnerParticipantId) pushLoser(m)
        for (const m of winnersMain) pushLoser(m)

        const uniqLosers = Array.from(new Set(losers))
        if (uniqLosers.length < 2) throw new Error('Za mało przegranych do wygenerowania drabinki')

        const seeds = await tx.participant.findMany({
            where: {id: {in: uniqLosers}},
            select: {id: true, balance: true},
            orderBy: {balance: 'desc'},
        })
        const seeded = seeds.map(s => s.id)

        const L = seeded.length
        const pow2Down = 1 << Math.floor(Math.log2(L))
        const playInPairs = L - pow2Down
        const l0Pool = playInPairs > 0 ? seeded.slice(-2 * playInPairs) : []
        const fixedL1 = playInPairs > 0 ? seeded.slice(0, seeded.length - l0Pool.length) : seeded.slice()

        const createdByRound: string[][] = []
        let roundOffset = 0

        if (playInPairs > 0) {
            const ids: string[] = []
            for (let i = 0; i < l0Pool.length; i += 2) {
                const a = l0Pool[i], b = l0Pool[i + 1]
                if (!a || !b) throw new Error('Nieprawidłowa liczba graczy w L0')
                const m = await tx.match.create({
                    data: {
                        tournamentId, bracket: 'LOSERS',
                        round: 1, indexInRound: ids.length,
                        participantAId: a, participantBId: b,
                        isBye: false, isPlayIn: true,
                        bestOf: defaultBestOf,
                    }
                })
                ids.push(m.id)
            }
            createdByRound.push(ids)
            roundOffset = 1
        }

        const winnersFromL0 = playInPairs > 0
            ? createdByRound[0].map(id => ({kind: 'fromMatch' as const, matchId: id}))
            : []

        const slotsL1: Array<
            | { kind: 'player', id: string }
            | { kind: 'fromMatch', matchId: string }
        > = []

        const k = Math.min(fixedL1.length, winnersFromL0.length)
        for (let i = 0; i < k; i++) slotsL1.push({kind: 'player', id: fixedL1[i]}, winnersFromL0[i])
        for (let i = k; i < fixedL1.length; i++) slotsL1.push({kind: 'player', id: fixedL1[i]})
        for (let i = k; i < winnersFromL0.length; i++) slotsL1.push(winnersFromL0[i])

        if (slotsL1.length % 2 !== 0) {
            throw new Error('Niezgodna liczba graczy w L1 (nieparzysta)')
        }

        const l1Ids: string[] = []
        for (let i = 0; i < slotsL1.length; i += 2) {
            const A = slotsL1[i], B = slotsL1[i + 1]
            const pidA = A.kind === 'player' ? A.id : null
            const pidB = B.kind === 'player' ? B.id : null
            const m = await tx.match.create({
                data: {
                    tournamentId, bracket: 'LOSERS',
                    round: 1 + roundOffset, indexInRound: l1Ids.length,
                    participantAId: pidA, participantBId: pidB,
                    isBye: false, isPlayIn: false,
                    bestOf: defaultBestOf
                }
            })
            l1Ids.push(m.id)
            if (A.kind === 'fromMatch') {
                await tx.match.update({where: {id: A.matchId}, data: {nextMatchId: m.id, nextMatchSlot: 'A'}})
            }
            if (B.kind === 'fromMatch') {
                await tx.match.update({where: {id: B.matchId}, data: {nextMatchId: m.id, nextMatchSlot: 'B'}})
            }
        }
        createdByRound.push(l1Ids)

        while (createdByRound[createdByRound.length - 1].length > 1) {
            const prev = createdByRound[createdByRound.length - 1]
            const cur: string[] = []
            const newRoundNumber = createdByRound.length + roundOffset

            for (let i = 0; i < prev.length / 2; i++) {
                const m = await tx.match.create({
                    data: {
                        tournamentId, bracket: 'LOSERS',
                        round: newRoundNumber, indexInRound: i,
                        isBye: false, isPlayIn: false, bestOf: defaultBestOf
                    }
                })
                cur.push(m.id)
            }

            for (let i = 0; i < prev.length; i++) {
                const target = cur[Math.floor(i / 2)]
                const slot = i % 2 === 0 ? 'A' : 'B'
                await tx.match.update({where: {id: prev[i]}, data: {nextMatchId: target, nextMatchSlot: slot}})
            }

            createdByRound.push(cur)
        }

        return true
    })
}


export async function reseedRound1(tournamentId: string) {
    return prisma.$transaction(async (tx) => {
        const t = await tx.tournament.findUnique({where: {id: tournamentId}})
        if (!t) throw new Error('Turniej nie znaleziony')
        if (t.type !== 'SOLO') throw new Error('Reseed tylko dla turniejów SOLO')
        const round = 1
        const editable = await prisma.match.findMany({
            where: {tournamentId: tournamentId, round: round, bracket: 'WINNERS', isBye: false},
            select: {id: true, winnerParticipantId: true, scoreA: true, scoreB: true}
        })

        const started = editable.some(m => m.winnerParticipantId || m.scoreA != null || m.scoreB != null)
        if (started) return NextResponse.json({message: 'Runda 0 rozpoczęta, edycja zablokowana'}, {status: 400})

        const picks = await tx.tournamentParticipant.findMany({
            where: {tournamentId},
            select: {participantId: true},
        })
        const shuffledIds = shuffle(picks.map(x => x.participantId))
        const grid = buildSingleElim(shuffledIds)

        for (let i = 0; i < editable.length; i++) {
            const A = grid[0][i]?.A ?? null
            const B = grid[0][i]?.B ?? null
            await tx.match.update({
                where: {id: editable[i].id},
                data: {
                    participantAId: A,
                    participantBId: B,
                    isBye: A === null || B === null,
                    scoreA: null,
                    scoreB: null
                },
            })
        }

        await autoAdvanceByes(tournamentId)
        return true
    })
}

