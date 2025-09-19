import { prisma } from '../prisma'

export function listDuels() {
    return prisma.duel.findMany({
        orderBy: { createdAt: 'desc' },
        include: { playerA: true, playerB: true, winner: true },
    })
}

export function getDuel(id: string) {
    return prisma.duel.findUnique({
        where: { id },
        include: { playerA: true, playerB: true, winner: true },
    })
}