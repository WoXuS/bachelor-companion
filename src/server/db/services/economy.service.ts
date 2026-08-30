import {badRequest, notFound} from '@/lib/errors'
import {Tx, withTx} from '../transaction'
import {computeEffectivePrice, getShopConfig} from './pricing.service'
import {prisma} from '../prisma'

const DOUBLE_POINTS_KEY = 'double-points-4'
const DOUBLE_POINTS_PACK = 4

export type LedgerEntry = {
    participantId: string
    amount: number
    reason: string
    matchId?: string | null
    counterpartyId?: string | null
    isDoubled?: boolean
}

export async function applyLedgerEntry(tx: Tx, entry: LedgerEntry) {
    const participant = await tx.participant.findUnique({
        where: {id: entry.participantId},
        select: {balance: true},
    })
    if (!participant) throw notFound('Nie znaleziono uczestnika')

    const balanceAfter = participant.balance + entry.amount
    if (balanceAfter < 0) throw badRequest('Niewystarczające środki')

    const created = await tx.transaction.create({
        data: {
            participantId: entry.participantId,
            amount: entry.amount,
            reason: entry.reason,
            balanceAfter,
            matchId: entry.matchId ?? null,
            counterpartyId: entry.counterpartyId ?? null,
            isDoubled: entry.isDoubled ?? false,
        },
    })
    await tx.participant.update({
        where: {id: entry.participantId},
        data: {balance: balanceAfter},
    })
    return created
}

export function addTransaction(entry: LedgerEntry, tx?: Tx) {
    return withTx((db) => applyLedgerEntry(db, entry), tx)
}

export function reverseMatchTransactions(matchId: string, tx?: Tx) {
    return withTx(async (db) => {
        const rows = await db.transaction.findMany({
            where: {matchId},
            select: {participantId: true, amount: true},
        })
        if (rows.length === 0) return

        const deltaByParticipant = new Map<string, number>()
        for (const row of rows) {
            deltaByParticipant.set(
                row.participantId,
                (deltaByParticipant.get(row.participantId) ?? 0) - row.amount,
            )
        }

        const participants = await db.participant.findMany({
            where: {id: {in: [...deltaByParticipant.keys()]}},
            select: {id: true, balance: true},
        })
        const balanceById = new Map(participants.map((p) => [p.id, p.balance]))

        for (const [participantId, delta] of deltaByParticipant) {
            if ((balanceById.get(participantId) ?? 0) + delta < 0) {
                throw badRequest(
                    `Nie można cofnąć – saldo uczestnika spadłoby poniżej zera (id=${participantId}).`,
                )
            }
        }

        for (const [participantId, delta] of deltaByParticipant) {
            if (delta !== 0) {
                await db.participant.update({
                    where: {id: participantId},
                    data: {balance: {increment: delta}},
                })
            }
        }

        await db.transaction.deleteMany({where: {matchId}})
    }, tx)
}

export async function purchaseFor(participantId: string, itemId: string) {
    const [item, cfg] = await Promise.all([
        prisma.shopItem.findUnique({where: {id: itemId}}),
        getShopConfig(),
    ])
    if (!item) throw notFound('Nie znaleziono przedmiotu')

    const {value: price, source, appliedPercent} = computeEffectivePrice(
        item.cost,
        {enabled: cfg.discountsEnabled, percent: cfg.discountPercent},
        {overrideEnabled: item.adjustOverrideEnabled, percent: item.adjustPercent},
    )

    return withTx(async (tx) => {
        if (item.key === DOUBLE_POINTS_KEY) {
            await tx.participantBuff.upsert({
                where: {participantId},
                create: {
                    participantId,
                    type: 'DOUBLE_POINTS',
                    remainingMatches: DOUBLE_POINTS_PACK,
                    active: true,
                },
                update: {
                    remainingMatches: {increment: DOUBLE_POINTS_PACK},
                    active: true,
                    type: 'DOUBLE_POINTS',
                },
            })
        }

        const suffix =
            source === 'item'
                ? ` (override ${appliedPercent > 0 ? '+' : ''}${appliedPercent}%)`
                : source === 'global'
                    ? ` (${appliedPercent}%)`
                    : ''

        return applyLedgerEntry(tx, {
            participantId,
            amount: -price,
            reason: `Zakup: ${item.label}${suffix}`,
        })
    })
}

export function transferBetween(
    params: {
        fromId: string
        toId: string
        amount: number
        reasonTo: string
        reasonFrom?: string | null
        matchId?: string | null
    },
    tx?: Tx,
) {
    const {fromId, toId, amount, reasonTo, reasonFrom, matchId} = params
    if (fromId === toId) throw badRequest('Nie można przelać samemu sobie')
    if (amount <= 0) throw badRequest('Kwota musi być większa od zera')

    return withTx(async (db) => {
        const prefix = matchId ? '' : 'TRANSAKCJA: '
        const txOut = await applyLedgerEntry(db, {
            participantId: fromId,
            amount: -amount,
            reason: `${prefix}${reasonFrom ?? reasonTo}`,
            counterpartyId: toId,
            matchId,
        })
        const txIn = await applyLedgerEntry(db, {
            participantId: toId,
            amount,
            reason: `${prefix}${reasonTo}`,
            counterpartyId: fromId,
            matchId,
        })
        return {txOut, txIn}
    }, tx)
}
