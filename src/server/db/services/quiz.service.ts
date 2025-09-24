import {prisma} from '@/server/db/prisma'
import {Prisma} from "@prisma/client"

const GROOM_POINTS = 20
const AUDIENCE_POINTS = 40
const AUDIENCE_BONUS = 50

function toStringArray(json: Prisma.JsonValue | null | undefined): string[] {
    if (!json) return []
    if (Array.isArray(json)) {
        return (json as Prisma.JsonArray).filter((v): v is string => typeof v === 'string')
    }
    return []
}

export async function getGroomStats() {
    const [total, answered, correct] = await Promise.all([
        prisma.quizQuestion.count({where: {kind: 'GROOM', active: true}}),
        prisma.quizQuestion.count({where: {kind: 'GROOM', active: true, answeredAt: {not: null}}}),
        prisma.quizQuestion.count({where: {kind: 'GROOM', active: true, groomCorrect: true}}),
    ])
    const incorrect = Math.max(0, answered - correct)
    return {
        total,
        answered,
        correct,
        incorrect,
        pointsEarned: correct * GROOM_POINTS,
        shots: incorrect,
    }
}

export async function undoLastGroom() {
    return prisma.$transaction(async (tx) => {
        const last = await tx.quizQuestion.findFirst({
            where: {kind: 'GROOM', active: true, answeredAt: {not: null}},
            orderBy: [{answeredAt: 'desc'}, {number: 'desc'}],
        })
        if (!last) throw new Error('Brak odpowiedzi do cofnięcia')

        await tx.quizQuestion.update({
            where: {id: last.id},
            data: {answeredAt: null, groomCorrect: null},
        })

        if (last.groomCorrect) {
            const cfg = await tx.shopConfig.findUnique({where: {id: 'singleton'}})
            if (cfg?.groomParticipantId) {
                const p = await tx.participant.findUnique({
                    where: {id: cfg.groomParticipantId},
                    select: {balance: true}
                })
                if (!p) throw new Error('Groom not found')
                const next = p.balance - GROOM_POINTS
                if (next < 0) throw new Error('Saldo nie może spaść poniżej zera (cofanie)')

                await tx.transaction.create({
                    data: {
                        participantId: cfg.groomParticipantId,
                        amount: -GROOM_POINTS,
                        reason: `COFNIĘCIE — Pytanie do pana młodego #${last.number}`,
                        balanceAfter: next,
                    },
                })
                await tx.participant.update({where: {id: cfg.groomParticipantId}, data: {balance: next}})
            }
        }

        return {undoneQuestionNumber: last.number}
    })
}

export async function undoLastAudience() {
    return prisma.$transaction(async (tx) => {
        const last = await tx.quizQuestion.findFirst({
            where: {kind: 'AUDIENCE', active: true, answeredAt: {not: null}, awardedParticipantId: {not: null}},
            orderBy: [{answeredAt: 'desc'}, {number: 'desc'}],
        })
        if (!last) throw new Error('Brak odpowiedzi do cofnięcia')

        const winnerId = last.awardedParticipantId!

        await tx.quizQuestion.update({
            where: {id: last.id},
            data: {answeredAt: null, awardedParticipantId: null},
        })

        const p = await tx.participant.findUnique({where: {id: winnerId}, select: {balance: true}})
        if (!p) throw new Error('Participant not found')
        const next = p.balance - AUDIENCE_POINTS
        if (next < 0) throw new Error('Saldo nie może spaść poniżej zera (cofanie)')

        await tx.transaction.create({
            data: {
                participantId: winnerId,
                amount: -AUDIENCE_POINTS,
                reason: `COFNIĘCIE — Pytanie do publiki #${last.number}`,
                balanceAfter: next,
            },
        })
        await tx.participant.update({where: {id: winnerId}, data: {balance: next}})

        return {undoneQuestionNumber: last.number, participantId: winnerId}
    })
}

export async function getAudienceStandings() {
    return prisma.$transaction(async (tx) => {
        const cfg = await tx.shopConfig.findUnique({where: {id: 'singleton'}})
        const excludeIds = toStringArray(cfg?.audienceExcludeIds)

        const rows = await tx.quizQuestion.groupBy({
            by: ['awardedParticipantId'],
            where: {kind: 'AUDIENCE', active: true, awardedParticipantId: {not: null}},
            _count: {_all: true},
        })

        const counts = rows
            .filter(r => r.awardedParticipantId && !excludeIds.includes(r.awardedParticipantId))
            .map(r => ({participantId: r.awardedParticipantId as string, correct: r._count._all}))

        const candidates = await tx.participant.findMany({
            where: {id: {notIn: excludeIds}},
            select: {id: true, name: true},
            orderBy: {name: 'asc'},
        })

        const byId = new Map(counts.map(c => [c.participantId, c.correct]))
        const full = candidates.map(c => ({
            id: c.id,
            name: c.name,
            correct: byId.get(c.id) ?? 0,
        }))

        full.sort((a, b) => b.correct - a.correct || a.name.localeCompare(b.name))

        const maxCorrect = full.length ? Math.max(...full.map(x => x.correct)) : 0

        const meta = await tx.quizMeta.findUnique({where: {id: 'singleton'}})
        const bonusGranted = !!meta?.audienceBonusGranted
        const winners = bonusGranted
            ? full.filter(x => x.correct === maxCorrect && maxCorrect > 0).map(x => x.id)
            : []

        return {standings: full, maxCorrect, bonusGranted, winners}
    })
}

export async function getNextQuestion(kind: 'GROOM' | 'AUDIENCE') {
    const [q, total, answered] = await Promise.all([
        prisma.quizQuestion.findFirst({where: {kind, active: true, answeredAt: null}, orderBy: {number: 'asc'}}),
        prisma.quizQuestion.count({where: {kind, active: true}}),
        prisma.quizQuestion.count({where: {kind, active: true, answeredAt: {not: null}}}),
    ])
    return {
        question: q ? {
            id: q.id, number: q.number, text: q.text, audioUrl: q.audioUrl, kind: q.kind,
        } : null,
        progress: {total, answered, nextIndex: (answered + 1), done: answered >= total},
    }
}

export async function markGroom(questionId: string, correct: boolean) {
    return prisma.$transaction(async (tx) => {
        const [cfg, q] = await Promise.all([
            tx.shopConfig.findUnique({where: {id: 'singleton'}}),
            tx.quizQuestion.findUnique({where: {id: questionId}}),
        ])
        if (!q || q.kind !== 'GROOM' || !q.active) throw new Error('Nieprawidłowe pytanie')
        if (q.answeredAt) throw new Error('Pytanie już ocenione')

        await tx.quizQuestion.update({
            where: {id: q.id},
            data: {answeredAt: new Date(), groomCorrect: correct},
        })

        if (correct && cfg?.groomParticipantId) {
            const p = await tx.participant.findUnique({where: {id: cfg.groomParticipantId}, select: {balance: true}})
            if (!p) throw new Error('Groom not found')
            const next = p.balance + GROOM_POINTS
            await tx.transaction.create({
                data: {
                    participantId: cfg.groomParticipantId,
                    amount: GROOM_POINTS,
                    reason: `Pytanie do pana młodego #${q.number} — poprawna odpowiedź`,
                    balanceAfter: next,
                },
            })
            await tx.participant.update({where: {id: cfg.groomParticipantId}, data: {balance: next}})
        }

        return true
    })
}

export async function awardAudience(questionId: string, participantId: string) {
    return prisma.$transaction(async (tx) => {
        const q = await tx.quizQuestion.findUnique({where: {id: questionId}})
        if (!q || q.kind !== 'AUDIENCE' || !q.active) throw new Error('Nieprawidłowe pytanie')
        if (q.answeredAt || q.awardedParticipantId) throw new Error('Pytanie już rozliczone')

        await tx.quizQuestion.update({
            where: {id: q.id},
            data: {answeredAt: new Date(), awardedParticipantId: participantId},
        })

        const p = await tx.participant.findUnique({where: {id: participantId}, select: {balance: true}})
        if (!p) throw new Error('Participant not found')
        const next = p.balance + AUDIENCE_POINTS
        await tx.transaction.create({
            data: {
                participantId,
                amount: AUDIENCE_POINTS,
                reason: `Pytanie do publiki #${q.number} — poprawna odpowiedź`,
                balanceAfter: next,
            },
        })
        await tx.participant.update({where: {id: participantId}, data: {balance: next}})

        return true
    })
}

export async function finalizeAudienceBonus() {
    return prisma.$transaction(async (tx) => {
        const meta = await tx.quizMeta.findUnique({where: {id: 'singleton'}})
        if (meta?.audienceBonusGranted) {
            return computeAudienceWinners(tx, false)
        }

        const [total, answered] = await Promise.all([
            tx.quizQuestion.count({where: {kind: 'AUDIENCE', active: true}}),
            tx.quizQuestion.count({where: {kind: 'AUDIENCE', active: true, answeredAt: {not: null}}}),
        ])
        if (total === 0 || answered < total) {
            throw new Error('Nie wszystkie pytania do publiki zostały jeszcze rozliczone')
        }

        const winners = await computeAudienceWinners(tx, true) // true => przyznaj nagrody
        await tx.quizMeta.upsert({
            where: {id: 'singleton'},
            update: {audienceBonusGranted: true},
            create: {id: 'singleton', audienceBonusGranted: true},
        })
        return winners
    })
}

async function computeAudienceWinners(
    tx: Prisma.TransactionClient,
    grant: boolean
) {
    const cfg = await tx.shopConfig.findUnique({where: {id: 'singleton'}})
    const excludeIds = toStringArray(cfg?.audienceExcludeIds)

    const rows = await tx.quizQuestion.groupBy({
        by: ['awardedParticipantId'],
        where: {kind: 'AUDIENCE', active: true, awardedParticipantId: {not: null}},
        _count: {_all: true},
    })

    const counts = rows
        .filter(r => r.awardedParticipantId && !excludeIds.includes(r.awardedParticipantId))
        .map(r => ({participantId: r.awardedParticipantId as string, correct: r._count._all}))

    if (counts.length === 0) return {winners: [], maxCorrect: 0}

    const maxCorrect = Math.max(...counts.map(c => c.correct))
    const winners = counts.filter(c => c.correct === maxCorrect)

    if (grant) {
        for (const w of winners) {
            const p = await tx.participant.findUnique({
                where: {id: w.participantId},
                select: {balance: true, name: true},
            })
            if (!p) continue
            const next = p.balance + AUDIENCE_BONUS
            await tx.transaction.create({
                data: {
                    participantId: w.participantId,
                    amount: AUDIENCE_BONUS,
                    reason: `Najwięcej poprawnych odpowiedzi w quizie publiki (${w.correct}) — bonus`,
                    balanceAfter: next,
                },
            })
            await tx.participant.update({where: {id: w.participantId}, data: {balance: next}})
        }
    }

    const enriched = await tx.participant.findMany({
        where: {id: {in: winners.map(w => w.participantId)}},
        select: {id: true, name: true},
    })

    return {
        winners: winners.map(w => ({
            participantId: w.participantId,
            name: enriched.find(e => e.id === w.participantId)?.name ?? '—',
            correct: w.correct,
        })),
        maxCorrect,
    }
}

