import { prisma } from '../prisma'

export function listShopItems() {
    return prisma.shopItem.findMany({ orderBy: { createdAt: 'asc' } })
}

export function getShopItem(id: string) {
    return prisma.shopItem.findUnique({ where: { id } })
}
