import {Match, Tournament} from '@prisma/client'
import {tournamentStarted} from '../repositories/tournaments.repo'
import {badRequest, notFound} from '@/lib/errors'
import {Tx, withTx} from '../transaction'
import {addTransaction} from './economy.service'
import {TMatch} from '@/types/tournament'
import {bestOfForRound, bracketOrder, buildSingleElim, nextPowerOfTwo, shuffle} from '@/lib/bracket'

type MatchForLogic = Pick<
    Match,
    | 'id'
    | 'tournamentId'
    | 'round'
    | 'participantAId'
    | 'participantBId'
    | 'teamAId'
    | 'teamBId'
    | 'winnerParticipantId'
    | 'winnerTeamId'
    | 'nextMatchId'
    | 'nextMatchSlot'
    | 'bracket'
    | 'isBye'
    | 'isPlayIn'
    | 'scoreA'
    | 'scoreB'
>

type TournamentForLogic = Pick<
    Tournament,
    'id' | 'type' | 'title' | 'mainPrize' | 'consolationPrize'
>

export async function createTeamTournament(params: {
    title: string
    mainPrize: number
    matchWinPrize: number
    teamA: { name: string; memberIds: string[] }
    teamB: { name: string; memberIds: string[] }
}) {
    const {title, mainPrize, teamA, teamB} = params
    return withTx(async (tx) => {
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

const BRACKET_LABEL: Record<'WINNERS' | 'LOSERS' | 'GRAND_FINAL', string> = {
    WINNERS: 'drab. wygranych',
    LOSERS: 'drab. przegranych',
    GRAND_FINAL: 'wygrana turnieju',
}

async function getActiveDP(tx: Tx, participantId: string) {
    return tx.participantBuff.findFirst({
        where: {participantId, type: 'DOUBLE_POINTS', active: true, remainingMatches: {gt: 0}},
        orderBy: {createdAt: 'desc'},
    })
}

async function decrementDPIfAny(tx: Tx, participantId: string, matchId: string) {
    const updated = await tx.participantBuff.updateMany({
        where: {participantId, type: 'DOUBLE_POINTS', active: true, remainingMatches: {gt: 0}},
        data: {remainingMatches: {decrement: 1}},
    })
    if (updated.count > 0) {
        await tx.participantBuff.updateMany({
            where: {participantId, type: 'DOUBLE_POINTS', remainingMatches: 0, active: true},
            data: {active: false},
        })
        await tx.participantBuffUsage.create({
            data: {participantId, matchId, used: 1},
        })
    }
}

async function isWinnersPlayInMatch(tx: Tx, tournamentId: string, round: number): Promise<boolean> {
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

async function isPlayInMatch(tx: Tx, m: TMatch): Promise<boolean> {
    if (m.bracket === 'LOSERS') return !!m.isPlayIn
    return await isWinnersPlayInMatch(tx, m.tournamentId, m.round)
}

async function teamMemberIds(tx: Tx, teamId: string): Promise<string[]> {
    const members = await tx.tournamentTeamMember.findMany({
        where: {teamId},
        select: {participantId: true},
    })
    return members.map(m => m.participantId)
}

function isSoloMatch(m: Pick<MatchForLogic, 'participantAId' | 'participantBId'>): boolean {
    return !!(m.participantAId || m.participantBId)
}


async function winnerParticipantIds(
    tx: Tx,
    m: MatchForLogic,
    winner: 'A' | 'B'
): Promise<string[]> {
    if (isSoloMatch(m)) {
        const pid = winner === 'A' ? m.participantAId : m.participantBId
        if (!pid) throw badRequest('Brak uczestnika po wybranej stronie')
        return [pid]
    } else {
        const tid = winner === 'A' ? m.teamAId : m.teamBId
        if (!tid) throw badRequest('Brak zespołu po wybranej stronie')
        return teamMemberIds(tx, tid)
    }
}

async function setMatchWinner(
    tx: Tx,
    m: MatchForLogic,
    winner: 'A' | 'B',
    scoreA?: number,
    scoreB?: number
): Promise<{ winnerParticipantId: string | null; winnerTeamId: string | null }> {
    const base = {scoreA: scoreA ?? null, scoreB: scoreB ?? null}
    if (isSoloMatch(m)) {
        const winnerParticipantId = winner === 'A' ? m.participantAId : m.participantBId
        if (!winnerParticipantId) throw badRequest('Brak uczestnika po wybranej stronie')
        await tx.match.update({where: {id: m.id}, data: {...base, winnerParticipantId}})
        return {winnerParticipantId, winnerTeamId: null}
    } else {
        const winnerTeamId = winner === 'A' ? m.teamAId : m.teamBId
        if (!winnerTeamId) throw badRequest('Brak zespołu po wybranej stronie')
        await tx.match.update({where: {id: m.id}, data: {...base, winnerTeamId}})
        return {winnerParticipantId: null, winnerTeamId}
    }
}

async function advanceWinner(tx: Tx, m: MatchForLogic, winner: 'A' | 'B') {
    if (!m.nextMatchId || !m.nextMatchSlot) return
    if (isSoloMatch(m)) {
        const pid = winner === 'A' ? m.participantAId : m.participantBId
        if (!pid) return
        await tx.match.update({
            where: {id: m.nextMatchId},
            data: m.nextMatchSlot === 'A' ? {participantAId: pid} : {participantBId: pid},
        })
    } else {
        const tid = winner === 'A' ? m.teamAId : m.teamBId
        if (!tid) return
        await tx.match.update({
            where: {id: m.nextMatchId},
            data: m.nextMatchSlot === 'A' ? {teamAId: tid} : {teamBId: tid},
        })
    }
}

async function payWithDP(tx: Tx, participantId: string, baseAmount: number, description: string, matchId: string) {
    const doubled = !!(await getActiveDP(tx, participantId))
    await addTransaction(
        {
            participantId,
            amount: doubled ? baseAmount * 2 : baseAmount,
            reason: description,
            matchId,
            isDoubled: doubled,
        },
        tx,
    )
}

async function payMany(tx: Tx, participantIds: string[], baseAmount: number, description: string, matchId: string) {
    for (const pid of participantIds) {
        await payWithDP(tx, pid, baseAmount, description, matchId)
    }
}

async function shouldPayWinPrize(tx: Tx, m: MatchForLogic): Promise<boolean> {
    const isFinal = !m.nextMatchId
    const isPlayIn = m.bracket === 'LOSERS' ? !!m.isPlayIn : await isWinnersPlayInMatch(tx, m.tournamentId, m.round)
    return !(isFinal || isPlayIn)
}

async function maybePayoutClosedBracket(
    tx: Tx,
    t: TournamentForLogic,
    bracket: 'WINNERS' | 'LOSERS'
) {
    const open = await tx.match.count({
        where: {tournamentId: t.id, bracket, winnerParticipantId: null, winnerTeamId: null},
    })
    if (open > 0) return

    const prize = bracket === 'WINNERS' ? t.mainPrize : t.consolationPrize
    if (!prize || prize <= 0) return

    const final = await tx.match.findFirst({
        where: {
            tournamentId: t.id,
            bracket,
            ...(t.type === 'SOLO'
                ? {winnerParticipantId: {not: null}}
                : {winnerTeamId: {not: null}}),
        },
        orderBy: [{round: 'desc'}, {indexInRound: 'asc'}],
    })
    if (!final) return

    if (t.type === 'SOLO' && final.winnerParticipantId) {
        await payWithDP(
            tx,
            final.winnerParticipantId,
            prize,
            `Wygrana ${bracket === 'WINNERS' ? 'turnieju' : BRACKET_LABEL[bracket]}, turniej: ${t.title}`,
            final.id
        )
    } else if (t.type !== 'SOLO' && final.winnerTeamId) {
        const members = await teamMemberIds(tx, final.winnerTeamId)
        await payMany(
            tx,
            members,
            prize,
            `Wygrana ${bracket === 'WINNERS' ? 'turnieju' : BRACKET_LABEL[bracket]}, turniej: ${t.title}`,
            final.id
        )
    }
}

async function participantsWhoPlayed(tx: Tx, m: MatchForLogic): Promise<string[]> {
    if (isSoloMatch(m)) {
        return [m.participantAId, m.participantBId].filter(Boolean) as string[]
    }
    const ids: string[] = []
    if (m.teamAId) ids.push(...(await teamMemberIds(tx, m.teamAId)))
    if (m.teamBId) ids.push(...(await teamMemberIds(tx, m.teamBId)))
    return ids
}

export async function reportMatch(params: { matchId: string; winner: 'A' | 'B'; scoreA?: number; scoreB?: number }) {
    return withTx(async (tx) => {
        const m = await tx.match.findUnique({where: {id: params.matchId}})
        if (!m) throw notFound('Mecz nie znaleziony')

        const t = await tx.tournament.findUnique({where: {id: m.tournamentId}})
        if (!t) throw notFound('Turniej nie znaleziony')

        const playIn = await isPlayInMatch(tx, m)

        await setMatchWinner(tx, m, params.winner, params.scoreA, params.scoreB)
        await advanceWinner(tx, m, params.winner)

        if (!playIn && t.matchWinPrize > 0 && await shouldPayWinPrize(tx, m)) {
            const winners = await winnerParticipantIds(tx, m, params.winner)
            const label = isSoloMatch(m)
                ? `Wygrana meczu (${BRACKET_LABEL[m.bracket]}) – Turniej: ${t.title}`
                : `Wygrana meczu drużynowego – Turniej: ${t.title}`
            await payMany(tx, winners, t.matchWinPrize, label, m.id)
        }

        if (m.bracket === 'WINNERS') {
            await maybePayoutClosedBracket(tx, t, 'WINNERS')
        } else {
            await maybePayoutClosedBracket(tx, t, 'LOSERS')
        }

        if (!playIn) {
            const played = await participantsWhoPlayed(tx, m)
            for (const pid of played) await decrementDPIfAny(tx, pid, m.id)
        }

        return true
    })
}

async function autoAdvanceByes(tx: Tx, tournamentId: string) {
    const r1 = await tx.match.findMany({
        where: {tournamentId, round: 1, isBye: true},
        select: {id: true, participantAId: true, participantBId: true, nextMatchId: true, nextMatchSlot: true},
    })
    for (const m of r1) {
        const winnerPid = m.participantAId ?? m.participantBId
        if (!winnerPid) continue
        await tx.match.update({
            where: {id: m.id},
            data: {winnerParticipantId: winnerPid, scoreA: 1, scoreB: 0},
        })
        if (m.nextMatchId && m.nextMatchSlot) {
            await tx.match.update({
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

export async function createSoloTournament(params: {
    title: string
    mainPrize: number
    matchWinPrize: number
    consolationPrize: number
    participantIds: string[]
}) {
    const ids = [...params.participantIds]

    return withTx(async (tx) => {
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
        const pow2Up = nextPowerOfTwo(n)
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
                const bestOf = bestOfForRound(rIdx + 1, maxRound)
                return idsInRound.map((id) => tx.match.update({where: {id}, data: {bestOf}}))
            })
        )

        return t
    }, undefined, {timeout: 60_000})
}

function startedLite(m: { isBye: boolean; winnerParticipantId: string | null }) {
    return !!m.winnerParticipantId || m.isBye
}

export async function createConsolationBracket(
    tournamentId: string,
    defaultBestOf: 1 | 3 | 5 = 1
) {
    return withTx(async (tx) => {
        const t = await tx.tournament.findUnique({where: {id: tournamentId}})
        if (!t) throw notFound('Turniej nie znaleziony')
        if (t.type !== 'SOLO') throw badRequest('Drabinka przegranych tylko dla turniejów SOLO')

        const exists = await tx.match.count({where: {tournamentId, bracket: 'LOSERS'}})
        if (exists > 0) throw badRequest('Drabinka przegranych już istnieje')

        const wins = await tx.match.findMany({
            where: {tournamentId, bracket: 'WINNERS'},
            orderBy: [{round: 'asc'}, {indexInRound: 'asc'}],
            select: {
                id: true, round: true, isBye: true,
                participantAId: true, participantBId: true, winnerParticipantId: true,
            },
        })
        if (!wins.length) throw badRequest('Brak meczów w drabince wygranych')

        const byRound = new Map<number, typeof wins>()
        for (const m of wins) {
            const arr = byRound.get(m.round) ?? []
            arr.push(m)
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
        if (!firstNoByeRound) throw badRequest('Nie znaleziono rundy drabinki wygranych bez auto-awansów')

        const winnersMain = byRound.get(firstNoByeRound)!
        if (!winnersMain.every(m => m.winnerParticipantId)) {
            throw badRequest(`Najpierw zakończ wszystkie mecze w rundzie ${firstNoByeRound} (WINNERS)`)
        }

        const losers: string[] = []
        const pushLoser = (m: typeof wins[number]) => {
            const A = m.participantAId, B = m.participantBId, W = m.winnerParticipantId
            if (!A || !B || !W) return
            losers.push(W === A ? B : A)
        }
        for (const m of winnersR0) if (!m.isBye && startedLite(m)) pushLoser(m)
        for (const m of winnersMain) pushLoser(m)

        const uniqLosers = Array.from(new Set(losers))
        if (uniqLosers.length < 2) throw badRequest('Za mało przegranych do wygenerowania drabinki')

        const seeds = await tx.participant.findMany({
            where: {id: {in: uniqLosers}},
            select: {id: true, balance: true},
            orderBy: {balance: 'desc'},
        })
        const seeded = seeds.map(s => s.id) // najlepszy balans = wyżej seed

        const L = seeded.length
        const pow2Down = 1 << Math.floor(Math.log2(L))
        const hasPlayIn = L !== pow2Down
        const playInPairs = L - pow2Down // liczba par w L0

        const l0Pool = hasPlayIn ? seeded.slice(-2 * playInPairs) : []
        const fixedL1 = hasPlayIn ? seeded.slice(0, seeded.length - l0Pool.length) : seeded.slice()

        async function createRound(
            roundNo: number,
            entrants: Entrant[],
            opts: { bracket: 'LOSERS'; isPlayIn: boolean; bestOf: 1 | 3 | 5 }
        ) {
            if (entrants.length % 2 !== 0) throw badRequest(`Niezgodna liczba slotów w rundzie ${roundNo}`)
            const ids: string[] = []
            const newMatches: { id: string }[] = []

            for (let i = 0; i < entrants.length; i += 2) {
                const A = entrants[i], B = entrants[i + 1]
                const pidA = A.kind === 'player' ? A.id : null
                const pidB = B.kind === 'player' ? B.id : null

                const m = await tx.match.create({
                    data: {
                        tournamentId,
                        bracket: opts.bracket,
                        round: roundNo,
                        indexInRound: ids.length,
                        participantAId: pidA,
                        participantBId: pidB,
                        isBye: false,
                        isPlayIn: opts.isPlayIn,
                        bestOf: opts.bestOf,
                    },
                    select: {id: true},
                })
                ids.push(m.id)
                newMatches.push(m)

                if (A.kind === 'fromMatch') {
                    await tx.match.update({where: {id: A.matchId}, data: {nextMatchId: m.id, nextMatchSlot: 'A'}})
                }
                if (B.kind === 'fromMatch') {
                    await tx.match.update({where: {id: B.matchId}, data: {nextMatchId: m.id, nextMatchSlot: 'B'}})
                }
            }

            return ids
        }

        const createdByRound: string[][] = []
        let roundNo = 1

        if (hasPlayIn) {
            const entrantsL0: Entrant[] = []
            for (let i = 0; i < l0Pool.length; i += 2) {
                const a = l0Pool[i], b = l0Pool[i + 1]
                if (!a || !b) throw badRequest('Nieprawidłowa liczba graczy w L0')
                entrantsL0.push({kind: 'player', id: a}, {kind: 'player', id: b})
            }
            const l0Ids = await createRound(roundNo, entrantsL0, {
                bracket: 'LOSERS',
                isPlayIn: true,
                bestOf: defaultBestOf
            })
            createdByRound.push(l0Ids)
            roundNo++
        }

        const winnersFromL0: Entrant[] = hasPlayIn ? createdByRound[0].map(id => ({
            kind: 'fromMatch',
            matchId: id
        })) : []
        const slotsL1: Entrant[] = []

        const k = Math.min(fixedL1.length, winnersFromL0.length)
        for (let i = 0; i < k; i++) slotsL1.push({kind: 'player', id: fixedL1[i]}, winnersFromL0[i])
        for (let i = k; i < fixedL1.length; i++) slotsL1.push({kind: 'player', id: fixedL1[i]})
        for (let i = k; i < winnersFromL0.length; i++) slotsL1.push(winnersFromL0[i])

        if (slotsL1.length % 2 !== 0) throw badRequest('Niezgodna liczba graczy w L1 (nieparzysta)')

        const l1Ids = await createRound(roundNo, slotsL1, {bracket: 'LOSERS', isPlayIn: false, bestOf: defaultBestOf})
        createdByRound.push(l1Ids)
        roundNo++

        while (createdByRound[createdByRound.length - 1].length > 1) {
            const prev = createdByRound[createdByRound.length - 1]
            const entrantsNext: Entrant[] = prev.map(id => ({kind: 'fromMatch', matchId: id}))
            const nextIds = await createRound(roundNo, entrantsNext, {
                bracket: 'LOSERS',
                isPlayIn: false,
                bestOf: defaultBestOf
            })
            createdByRound.push(nextIds)
            roundNo++
        }

        return true
    })
}


export async function reseedRound1(tournamentId: string) {
    return withTx(async (tx) => {
        const t = await tx.tournament.findUnique({where: {id: tournamentId}})
        if (!t) throw notFound('Turniej nie znaleziony')
        if (t.type !== 'SOLO') throw badRequest('Reseed tylko dla turniejów SOLO')
        const round = 1
        const editable = await tx.match.findMany({
            where: {tournamentId, round, bracket: 'WINNERS', isBye: false},
            select: {id: true, winnerParticipantId: true, scoreA: true, scoreB: true}
        })

        const started = editable.some(m => m.winnerParticipantId || m.scoreA != null || m.scoreB != null)
        if (started) throw badRequest('Runda 0 rozpoczęta, edycja zablokowana')

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

        await autoAdvanceByes(tx, tournamentId)
        return true
    })
}


export function updateTournamentBasics(
    id: string,
    patch: {title?: string; mainPrize?: number; matchWinPrize?: number; consolationPrize?: number},
) {
    return withTx(async (tx) => {
        const started = await tournamentStarted(id)
        const data: typeof patch = {}

        if (patch.title !== undefined) data.title = patch.title
        if (patch.mainPrize !== undefined) data.mainPrize = patch.mainPrize

        if (!started) {
            if (patch.matchWinPrize !== undefined) data.matchWinPrize = patch.matchWinPrize
            if (patch.consolationPrize !== undefined) data.consolationPrize = patch.consolationPrize
        }

        return tx.tournament.update({where: {id}, data})
    })
}

type EntrantsInput = {participantIds: string[]} | {teamA: TeamInput; teamB: TeamInput}
type TeamInput = {name: string; memberIds: string[]}

export function replaceTournamentEntrants(id: string, input: EntrantsInput) {
    return withTx(async (tx) => {
        const tournament = await tx.tournament.findUnique({where: {id}})
        if (!tournament) throw notFound('Turniej nie znaleziony')
        if (await tournamentStarted(id)) throw badRequest('Turniej już wystartował')

        if (tournament.type === 'SOLO') {
            if (!('participantIds' in input)) throw badRequest('Oczekiwano listy uczestników')
            await tx.tournamentParticipant.deleteMany({where: {tournamentId: id}})
            if (input.participantIds.length > 0) {
                await tx.tournamentParticipant.createMany({
                    data: input.participantIds.map((participantId) => ({tournamentId: id, participantId})),
                })
            }
            return
        }

        if (!('teamA' in input)) throw badRequest('Oczekiwano dwóch zespołów')
        const teams = await tx.tournamentTeam.findMany({
            where: {tournamentId: id},
            orderBy: {createdAt: 'asc'},
        })
        if (teams.length !== 2) throw badRequest('Oczekiwano 2 zespołów')

        await tx.tournamentTeam.update({where: {id: teams[0].id}, data: {name: input.teamA.name}})
        await tx.tournamentTeam.update({where: {id: teams[1].id}, data: {name: input.teamB.name}})
        await tx.tournamentTeamMember.deleteMany({
            where: {teamId: {in: [teams[0].id, teams[1].id]}},
        })
        await tx.tournamentTeamMember.createMany({
            data: [
                ...input.teamA.memberIds.map((participantId) => ({teamId: teams[0].id, participantId})),
                ...input.teamB.memberIds.map((participantId) => ({teamId: teams[1].id, participantId})),
            ],
        })
    })
}

export function reseedPairs(
    tournamentId: string,
    round: number,
    pairs: Array<{matchId: string; participantAId: string | null; participantBId: string | null}>,
) {
    return withTx(async (tx) => {
        const editable = await tx.match.findMany({
            where: {tournamentId, round, bracket: 'WINNERS', isBye: false},
            select: {id: true, winnerParticipantId: true, scoreA: true, scoreB: true},
        })

        const started = editable.some(
            (m) => m.winnerParticipantId || m.scoreA != null || m.scoreB != null,
        )
        if (started) throw badRequest('Runda rozpoczęta, edycja zablokowana')

        const editableIds = new Set(editable.map((m) => m.id))
        for (const pair of pairs) {
            if (!editableIds.has(pair.matchId)) {
                throw badRequest('Nie można edytować meczu (auto-awans)')
            }
        }

        const seen = new Set<string>()
        for (const pair of pairs) {
            for (const participantId of [pair.participantAId, pair.participantBId]) {
                if (!participantId) continue
                if (seen.has(participantId)) throw badRequest('Ten sam uczestnik w wielu slotach')
                seen.add(participantId)
            }
        }

        for (const pair of pairs) {
            await tx.match.update({
                where: {id: pair.matchId},
                data: {
                    participantAId: pair.participantAId,
                    participantBId: pair.participantBId,
                    scoreA: null,
                    scoreB: null,
                    winnerParticipantId: null,
                },
            })
        }
    })
}
