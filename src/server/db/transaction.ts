import type {Prisma} from '@prisma/client'
import {prisma} from './prisma'

export type Tx = Prisma.TransactionClient

export function withTx<T>(
    fn: (tx: Tx) => Promise<T>,
    tx?: Tx,
    options?: {timeout?: number},
): Promise<T> {
    return tx ? fn(tx) : prisma.$transaction(fn, options)
}
