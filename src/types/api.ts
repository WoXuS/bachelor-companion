import { TournamentType } from '@/types/tournament'
import { TTournament, TMatch } from '@/types/tournament'

export type TeamInput = { name: string; memberIds: string[] }

export type CreateTournamentPayload =
    | {
    type: TournamentType.SOLO
    title: string
    mainPrize: number
    matchWinPrize: number
    consolationPrize: number
    participantIds: string[]
}
    | {
    type: TournamentType.TEAM
    title: string
    mainPrize: number
    matchWinPrize: number
    consolationPrize: number
    teamA: TeamInput
    teamB: TeamInput
}

export type ApiError = { message: string }

export type TournamentListItemDto =
    Pick<TTournament, 'id' | 'title' | 'type' | 'mainPrize' | 'matchWinPrize' | 'consolationPrize'> & {
    matches?: Array<
        Pick<
            TMatch,
            | 'id'
            | 'round'
            | 'indexInRound'
            | 'bracket'
            | 'participantAId'
            | 'participantBId'
            | 'winnerParticipantId'
            | 'teamAId'
            | 'teamBId'
            | 'winnerTeamId'
            | 'nextMatchId'
            | 'scoreA'
            | 'scoreB'
            | 'isBye'
            | 'isPlayIn'
            | 'bestOf'
        >
    >
}