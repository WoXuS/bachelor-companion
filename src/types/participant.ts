import { Participant } from '@prisma/client'

export type ParticipantDb = Participant

export type ParticipantDto = {
    id: string
    name: string
    avatarUrl: string | null
    balance: number
}
