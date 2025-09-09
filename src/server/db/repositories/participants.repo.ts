import { prisma } from '../prisma'

export function listParticipants() {
    return prisma.participant.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } })
}
export function getParticipant(id: string) {
    return prisma.participant.findUnique({ where: { id } })
}
export function upsertParticipant(data: { id?: string; name: string; avatarUrl?: string | null; active?: boolean }) {
    return prisma.participant.upsert({
        where: { id: data.id ?? '' },
        update: { name: data.name, avatarUrl: data.avatarUrl ?? null, active: data.active ?? true },
        create: { name: data.name, avatarUrl: data.avatarUrl ?? null, active: data.active ?? true },
    })
}
