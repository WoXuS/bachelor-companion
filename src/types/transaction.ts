import {Transaction} from '@prisma/client'

export type TransactionDb = Transaction

export type TransactionDto = {
    id: string
    amount: number
    reason: string
    createdAt: string
    participant: {
        balance: number; id: string; name: string
    }
    balanceAfter?: number
    counterparty?: { id: string; name: string } | null
    isDoubled?: boolean | false
}
