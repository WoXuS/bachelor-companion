import {describe, expect, it, vi} from 'vitest'
import type {Tx} from '../transaction'
import {applyLedgerEntry, reverseMatchTransactions} from './economy.service'

type LedgerRow = {participantId: string; amount: number}

function fakeTx(balances: Record<string, number>, rows: LedgerRow[] = []) {
    const created: unknown[] = []
    const updates: Array<{id: string; balance?: number; increment?: number}> = []
    const deleted: string[] = []

    const tx = {
        participant: {
            findUnique: vi.fn(async ({where}: {where: {id: string}}) =>
                where.id in balances ? {balance: balances[where.id]} : null,
            ),
            findMany: vi.fn(async ({where}: {where: {id: {in: string[]}}}) =>
                where.id.in.map((id) => ({id, balance: balances[id] ?? 0})),
            ),
            update: vi.fn(async ({where, data}: {where: {id: string}; data: Record<string, unknown>}) => {
                if (typeof data.balance === 'number') {
                    balances[where.id] = data.balance
                    updates.push({id: where.id, balance: data.balance})
                } else {
                    const inc = (data.balance as {increment: number}).increment
                    balances[where.id] += inc
                    updates.push({id: where.id, increment: inc})
                }
            }),
        },
        transaction: {
            create: vi.fn(async ({data}: {data: unknown}) => {
                created.push(data)
                return data
            }),
            findMany: vi.fn(async () => rows),
            deleteMany: vi.fn(async ({where}: {where: {matchId: string}}) => {
                deleted.push(where.matchId)
                return {count: rows.length}
            }),
        },
    }

    return {tx: tx as unknown as Tx, created, updates, deleted, balances}
}

describe('applyLedgerEntry', () => {
    it('records the balance after the entry and updates the participant', async () => {
        const {tx, created, balances} = fakeTx({p1: 100})

        await applyLedgerEntry(tx, {participantId: 'p1', amount: 50, reason: 'Wygrana'})

        expect(created).toEqual([
            expect.objectContaining({participantId: 'p1', amount: 50, reason: 'Wygrana', balanceAfter: 150}),
        ])
        expect(balances.p1).toBe(150)
    })

    it('allows a debit that lands exactly on zero', async () => {
        const {tx, balances} = fakeTx({p1: 50})
        await applyLedgerEntry(tx, {participantId: 'p1', amount: -50, reason: 'Zakup'})
        expect(balances.p1).toBe(0)
    })

    it('refuses a debit that would overdraw the balance', async () => {
        const {tx, created, balances} = fakeTx({p1: 40})

        await expect(
            applyLedgerEntry(tx, {participantId: 'p1', amount: -50, reason: 'Zakup'}),
        ).rejects.toThrow('Niewystarczające środki')

        expect(created).toEqual([])
        expect(balances.p1).toBe(40)
    })

    it('fails when the participant does not exist', async () => {
        const {tx} = fakeTx({})
        await expect(
            applyLedgerEntry(tx, {participantId: 'ghost', amount: 10, reason: 'x'}),
        ).rejects.toThrow('Nie znaleziono uczestnika')
    })

    it('defaults the optional relation fields', async () => {
        const {tx, created} = fakeTx({p1: 0})
        await applyLedgerEntry(tx, {participantId: 'p1', amount: 10, reason: 'x'})
        expect(created[0]).toMatchObject({matchId: null, counterpartyId: null, isDoubled: false})
    })

    it('keeps the double-points marker and match link', async () => {
        const {tx, created} = fakeTx({p1: 0})
        await applyLedgerEntry(tx, {
            participantId: 'p1',
            amount: 20,
            reason: 'x',
            matchId: 'm1',
            isDoubled: true,
        })
        expect(created[0]).toMatchObject({matchId: 'm1', isDoubled: true})
    })
})

describe('reverseMatchTransactions', () => {
    it('gives back what the match paid out', async () => {
        const {tx, updates, deleted, balances} = fakeTx({p1: 150, p2: 90}, [
            {participantId: 'p1', amount: 50},
            {participantId: 'p2', amount: 40},
        ])

        await reverseMatchTransactions('m1', tx)

        expect(balances).toEqual({p1: 100, p2: 50})
        expect(updates).toEqual([
            {id: 'p1', increment: -50},
            {id: 'p2', increment: -40},
        ])
        expect(deleted).toEqual(['m1'])
    })

    it('nets multiple entries for the same participant', async () => {
        const {tx, updates, balances} = fakeTx({p1: 100}, [
            {participantId: 'p1', amount: 50},
            {participantId: 'p1', amount: -20},
        ])

        await reverseMatchTransactions('m1', tx)

        expect(balances.p1).toBe(70)
        expect(updates).toEqual([{id: 'p1', increment: -30}])
    })

    it('refuses to reverse when it would overdraw a balance', async () => {
        const {tx, updates, deleted, balances} = fakeTx({p1: 10}, [
            {participantId: 'p1', amount: 50},
        ])

        await expect(reverseMatchTransactions('m1', tx)).rejects.toThrow(/poniżej zera/)

        expect(updates).toEqual([])
        expect(deleted).toEqual([])
        expect(balances.p1).toBe(10)
    })

    it('does nothing when the match has no transactions', async () => {
        const {tx, updates, deleted} = fakeTx({p1: 100}, [])
        await reverseMatchTransactions('m1', tx)
        expect(updates).toEqual([])
        expect(deleted).toEqual([])
    })

    it('skips the update when the net delta is zero', async () => {
        const {tx, updates, deleted} = fakeTx({p1: 100}, [
            {participantId: 'p1', amount: 50},
            {participantId: 'p1', amount: -50},
        ])

        await reverseMatchTransactions('m1', tx)

        expect(updates).toEqual([])
        expect(deleted).toEqual(['m1'])
    })
})
