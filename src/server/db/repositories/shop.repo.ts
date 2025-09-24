import {prisma} from '../prisma'
import {UpdateShopItemPatch} from "@/types/shop-item";

export function listShopItems() {
    return prisma.shopItem.findMany({orderBy: {createdAt: 'asc'}})
}

export function getShopItem(id: string) {
    return prisma.shopItem.findUnique({where: {id}})
}

export function createShopItem(data: { key: string; label: string; cost: number; category: string }) {
    return prisma.shopItem.create({data})
}

export function updateShopItem(id: string, data: UpdateShopItemPatch) {
    return prisma.shopItem.update({where: {id}, data})
}

export function deleteShopItem(id: string) {
    return prisma.shopItem.delete({where: {id}})
}
