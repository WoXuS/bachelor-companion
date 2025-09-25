import {prisma} from '@/server/db/prisma'
import {Prisma, EasterEggType, Transaction} from '@prisma/client'
import {EggClaimedEvent} from "@/server/realtime/pusher";

const EGG_POINTS = 50

type Tx = Prisma.TransactionClient

type Counts = { total: number; found: number; remaining: number }

async function countsForType(tx: Tx, type: EasterEggType): Promise<Counts> {
    const total = await tx.easterEgg.count({where: {type}})
    const found = await tx.easterEgg.count({where: {type, active: false}})
    return {total, found, remaining: total - found}
}

type EggForApi = {
    id: string
    code: string
    number: number
    type: EasterEggType
    active: boolean
    label: string | null
    placementKey: string | null
    claimedAt: Date | null
    claimedBy: { id: string; name: string } | null
}

export async function getEggByCodeWithCounts(
    code: string
): Promise<{ egg: EggForApi; counts: Counts } | null> {
    return prisma.$transaction(async (tx) => {
        const egg = await tx.easterEgg.findUnique({
            where: {code},
            select: {
                id: true,
                code: true,
                number: true,
                type: true,
                active: true,
                label: true,
                placementKey: true,
                claimedAt: true,
                claimedBy: {select: {id: true, name: true}},
            },
        })
        if (!egg) return null
        const counts = await countsForType(tx, egg.type)
        return {egg, counts}
    })
}

export async function getEggByIdWithCounts(
    id: string
): Promise<{ egg: EggForApi; counts: Counts } | null> {
    return prisma.$transaction(async (tx) => {
        const egg = await tx.easterEgg.findUnique({
            where: {id},
            select: {
                id: true,
                code: true,
                number: true,
                type: true,
                active: true,
                label: true,
                placementKey: true,
                claimedAt: true,
                claimedBy: {select: {id: true, name: true}},
            },
        })
        if (!egg) return null
        const counts = await countsForType(tx, egg.type)
        return {egg, counts}
    })
}

export async function getEggByPlacement(placementKey: string) {
    return prisma.easterEgg.findFirst({
        where: {placementKey},
        select: {
            id: true,
            code: true,
            number: true,
            type: true,
            active: true,
            label: true,
            placementKey: true,
        },
    })
}

export async function claimEggByCode(
    code: string,
    participantId: string
): Promise<{ tx: Transaction; event: EggClaimedEvent }> {
    return prisma.$transaction(async (tx) => {
        const egg = await tx.easterEgg.findUnique({where: {code}})
        if (!egg) throw new Error('Nie znaleziono jajka')
        if (!egg.active) throw new Error('Jajko jest nieaktywne')

        const {total, found} = await countsForType(tx, egg.type)
        const x = found + 1
        const remainingAfter = total - x
        const claimedAt = new Date()

        await tx.easterEgg.update({
            where: {id: egg.id},
            data: {active: false, claimedById: participantId, claimedAt: new Date()},
        })

        const participant = await tx.participant.findUnique({
            where: {id: participantId},
            select: {balance: true, name: true},
        })
        if (!participant) throw new Error('Participant not found')
        const next = participant.balance + EGG_POINTS

        const typeLabel = egg.type === 'PHYSICAL' ? 'Fizyczny' : 'Wirtualny'
        const reason = `${typeLabel} easter egg ${x}/${total} (pozostało: ${remainingAfter})`

        const created = await tx.transaction.create({
            data: {
                participantId,
                amount: EGG_POINTS,
                reason,
                balanceAfter: next,
                matchId: null,
                isDoubled: false,
            },
        })

        await tx.participant.update({
            where: {id: participantId},
            data: {balance: next},
        })

        const event: EggClaimedEvent = {
            type: egg.type,
            number: egg.number,
            label: egg.label ?? null,
            participantName: participant.name,
            claimedAt: claimedAt.toISOString(),
            counts: {total, remaining: remainingAfter}
        }

        return {tx: created, event}
    })
}

export async function claimEggById(
    id: string,
    participantId: string
): Promise<{ tx: Transaction; event: EggClaimedEvent }> {
    return prisma.$transaction(async (tx) => {
        const egg = await tx.easterEgg.findUnique({where: {id}})
        if (!egg) throw new Error('Nie znaleziono jajka')
        if (!egg.active) throw new Error('Jajko jest nieaktywne')

        const {total, found} = await countsForType(tx, egg.type)
        const x = found + 1
        const remainingAfter = total - x
        const claimedAt = new Date()
        await tx.easterEgg.update({
            where: {id: egg.id},
            data: {active: false, claimedById: participantId, claimedAt: new Date()},
        })

        const participant = await tx.participant.findUnique({
            where: {id: participantId},
            select: {balance: true, name: true},
        })
        if (!participant) throw new Error('Participant not found')
        const next = participant.balance + EGG_POINTS

        const typeLabel = egg.type === 'PHYSICAL' ? 'Fizyczny' : 'Wirtualny'
        const reason = `${typeLabel} easter egg ${x}/${total} (pozostało: ${remainingAfter})`

        const created = await tx.transaction.create({
            data: {
                participantId,
                amount: EGG_POINTS,
                reason,
                balanceAfter: next,
                matchId: null,
                isDoubled: false,
            },
        })

        await tx.participant.update({
            where: {id: participantId},
            data: {balance: next},
        })

        const event: EggClaimedEvent = {
            type: egg.type,
            number: egg.number,
            label: egg.label ?? null,
            participantName: participant.name,
            claimedAt: claimedAt.toISOString(),
            counts: {total, remaining: remainingAfter}
        }

        return {tx: created, event}
    })
}

export async function reactivateEgg(id: string) {
    return prisma.easterEgg.update({
        where: {id},
        data: {active: true, claimedAt: null, claimedById: null},
        select: {id: true, active: true},
    })
}

export async function assignPlacement(id: string, placementKey: string | null) {
    if (placementKey) {
        await prisma.easterEgg.updateMany({
            where: {placementKey},
            data: {placementKey: null},
        })
    }
    return prisma.easterEgg.update({
        where: {id},
        data: {placementKey},
    })
}
