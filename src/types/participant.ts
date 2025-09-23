import {Participant} from '@prisma/client'

export type ParticipantDb = Participant

export type ParticipantDto = {
    id: string
    name: string
    avatarUrl: string | null
    balance: number
    buffs: ParticipantBuff[]
}

type ParticipantBuff = {
    id: string
    participantId: string
    remainingMatches: number
    active: boolean
    type: BuffType
}

export type BuffType = "DOUBLE_POINTS"
