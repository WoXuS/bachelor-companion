import {prisma} from '../prisma'

export function setMatchBestOf(id: string, bestOf: number) {
    return prisma.match.update({where: {id}, data: {bestOf}})
}
