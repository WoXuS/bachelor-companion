import {prisma} from '../prisma'

export function listPrizes() {
    return prisma.prize.findMany({orderBy: {place: 'asc'}})
}
