import {Tournament} from '@prisma/client'

export type TournamentDb = Tournament

export enum TournamentType {
    SOLO = 'SOLO',
    TEAM = 'TEAM',
}

export type TournamentDto = {
    id: string
    title: string
    mainPrize: number
    matchWinPrize: number
    type: TournamentType
}

export type MatchSummaryDto = {
    id: string
    round: number
    indexInRound: number
    winnerParticipantId?: string | null
    winnerTeamId?: string | null
}

export type TournamentListItemDto = TournamentDto & {
    matches: MatchSummaryDto[]
}

export type TournamentParticipant = {
    id: string
    tournamentId: string
    participantId: string
}

export type CreateSoloTournamentPayload = {
    type: TournamentType.SOLO
    title: string
    mainPrize: number
    matchWinPrize: number
    participantIds: string[]
}

export type CreateTeamTournamentPayload = {
    type: TournamentType.TEAM
    title: string
    mainPrize: number
    matchWinPrize: number
    teamA: { name: string; memberIds: string[] }
    teamB: { name: string; memberIds: string[] }
}

export type CreateTournamentPayload =
    | CreateSoloTournamentPayload
    | CreateTeamTournamentPayload

export type ApiError = { message: string }
