import { prisma } from '../prisma'

export async function getRanking() {
    const rows = await prisma.participant.findMany({
        where: { active: true },
        select: { id: true, name: true, balance: true, avatarUrl: true, buffs: true },
    })
    return rows.sort((a,b)=>b.balance-a.balance)
}
