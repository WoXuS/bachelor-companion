import {z} from 'zod'

export const idParams = z.object({id: z.string().min(1)})
export const codeParams = z.object({code: z.string().min(1)})
export const keyParams = z.object({key: z.string().min(1)})

export const participantIdBody = z.object({participantId: z.string().min(1)})

export const bestOfBody = z.object({bestOf: z.coerce.number().int().refine((n) => [1, 3, 5].includes(n), {
    message: 'bestOf musi wynosić 1, 3 lub 5',
})})

export const winnerSide = z.enum(['A', 'B'])
export const score = z.coerce.number().int().min(0).optional()

export const nonNegativeInt = z.coerce.number().int().min(0)

export const teamInput = z.object({
    name: z.string().trim().min(1),
    memberIds: z.array(z.string().min(1)),
})
