import {Prisma, EasterEggType, Transaction} from '@prisma/client'
import {badRequest, conflict, notFound} from '@/lib/errors'
import {prisma} from '@/server/db/prisma'
import {Tx, withTx} from '@/server/db/transaction'
import {applyLedgerEntry} from '@/server/db/services/economy.service'
import {EggClaimedEvent} from '@/server/realtime/pusher'

const EGG_POINTS = 50

type Counts = {total: number; found: number; remaining: number}

export type EggForApi = {
    id: string
    code: string
    number: number
    type: EasterEggType
    active: boolean
    label: string | null
    placementKey: string | null
    claimedAt: Date | null
    claimedBy: {id: string; name: string} | null
}

const EGG_SELECT = {
    id: true,
    code: true,
    number: true,
    type: true,
    active: true,
    label: true,
    placementKey: true,
    claimedAt: true,
    claimedBy: {select: {id: true, name: true}},
} satisfies Prisma.EasterEggSelect

async function countsForType(tx: Tx, type: EasterEggType): Promise<Counts> {
    const [total, found] = await Promise.all([
        tx.easterEgg.count({where: {type}}),
        tx.easterEgg.count({where: {type, active: false}}),
    ])
    return {total, found, remaining: total - found}
}

export function getEggWithCounts(
    where: Prisma.EasterEggWhereUniqueInput,
): Promise<{egg: EggForApi; counts: Counts} | null> {
    return withTx(async (tx) => {
        const egg = await tx.easterEgg.findUnique({where, select: EGG_SELECT})
        if (!egg) return null
        return {egg, counts: await countsForType(tx, egg.type)}
    })
}

export function getEggByPlacement(placementKey: string) {
    return prisma.easterEgg.findFirst({
        where: {placementKey},
        select: {id: true, number: true, type: true, active: true, label: true, placementKey: true},
    })
}

export function claimEgg(
    where: Prisma.EasterEggWhereUniqueInput,
    participantId: string,
): Promise<{tx: Transaction; event: EggClaimedEvent}> {
    return withTx(async (tx) => {
        const egg = await tx.easterEgg.findUnique({where})
        if (!egg) throw notFound('Nie znaleziono jajka')
        if (!egg.active) throw badRequest('Jajko jest nieaktywne')

        const claimedAt = new Date()
        const claimed = await tx.easterEgg.updateMany({
            where: {id: egg.id, active: true},
            data: {active: false, claimedById: participantId, claimedAt},
        })
        if (claimed.count === 0) throw conflict('Jajko zostało właśnie znalezione przez kogoś innego')

        const participant = await tx.participant.findUnique({
            where: {id: participantId},
            select: {name: true},
        })
        if (!participant) throw notFound('Nie znaleziono uczestnika')

        const {total, found} = await countsForType(tx, egg.type)
        const remaining = total - found
        const typeLabel = egg.type === 'PHYSICAL' ? 'Fizyczny' : 'Wirtualny'

        const created = await applyLedgerEntry(tx, {
            participantId,
            amount: EGG_POINTS,
            reason: `${typeLabel} easter egg ${found}/${total} (pozostało: ${remaining})`,
        })

        return {
            tx: created,
            event: {
                type: egg.type,
                number: egg.number,
                label: egg.label,
                participantName: participant.name,
                claimedAt: claimedAt.toISOString(),
                counts: {total, remaining},
            },
        }
    })
}

export function reactivateEgg(id: string) {
    return prisma.easterEgg.update({
        where: {id},
        data: {active: true, claimedAt: null, claimedById: null},
        select: {id: true, active: true},
    })
}

export function assignPlacement(id: string, placementKey: string | null) {
    return withTx(async (tx) => {
        if (placementKey) {
            await tx.easterEgg.updateMany({where: {placementKey}, data: {placementKey: null}})
        }
        return tx.easterEgg.update({
            where: {id},
            data: {placementKey},
            select: {id: true, placementKey: true},
        })
    })
}

export function listEggsForAdmin() {
    return prisma.easterEgg.findMany({
        orderBy: [{type: 'asc'}, {number: 'asc'}],
        select: EGG_SELECT,
    })
}
