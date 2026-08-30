import {prisma} from '../prisma'

export function listAllParticipants() {
    return prisma.participant.findMany({orderBy: {createdAt: 'asc'}})
}

export function upsertParticipant(data: {id?: string; name: string; avatarUrl?: string | null}) {
    const values = {name: data.name, avatarUrl: data.avatarUrl ?? null}
    return data.id
        ? prisma.participant.update({where: {id: data.id}, data: values})
        : prisma.participant.create({data: {...values, active: true}})
}

export function deleteParticipant(id: string) {
    return prisma.participant.delete({where: {id}})
}
