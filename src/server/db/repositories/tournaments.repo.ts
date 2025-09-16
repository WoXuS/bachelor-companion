import {prisma} from '../prisma'

export function listTournaments() {
    return prisma.tournament.findMany({
        orderBy: {createdAt: 'desc'},
        include: {
            matches: {
                where: {round: {gt: 0}},
                orderBy: [{round: 'desc'}, {indexInRound: 'asc'}],
                take: 1,
            },
        },
    })
}

export function getTournament(id: string) {
    return prisma.tournament.findUnique({
        where: {id},
        include: {
            participants: {include: {participant: true}},
            teams: {include: {members: {include: {participant: true}}}},
            matches: true,
        },
    })
}

export function deleteTournament(id: string) {
    return prisma.tournament.delete({where: {id}})
}
