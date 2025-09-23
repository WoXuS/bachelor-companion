import {Tournament, Prisma} from '@prisma/client'

export type TournamentDb = Tournament

export enum TournamentType {
    SOLO = 'SOLO',
    TEAM = 'TEAM',
}

export type TParticipant = { id: string; name: string }
export type TTeam = { id: string; name: string; members?: { participant: TParticipant }[] }
export type TTP = { participantId: string; participant: TParticipant }
export type BracketKind = 'WINNERS' | 'LOSERS' | 'GRAND_FINAL'

export type TMatch = {
    id: string
    tournamentId: string
    round: number
    indexInRound: number
    participantAId?: string | null
    participantBId?: string | null
    winnerParticipantId?: string | null
    teamAId?: string | null
    teamBId?: string | null
    winnerTeamId?: string | null
    nextMatchId?: string | null
    nextMatchSlot?: string | null
    loserNextMatchId?: string | null
    scoreA?: number | null
    scoreB?: number | null
    isBye?: boolean
    isPlayIn?: boolean;
    bestOf: number
    bracket?: BracketKind
}

export type TTournament = {
    id: string
    title: string
    type: TournamentType
    mainPrize: number
    matchWinPrize: number
    consolationPrize: number
    participants: TTP[]
    teams: TTeam[]
    matches: TMatch[]
    _dpRemainingByParticipant?: Record<string, number>
    _payoutDoubledByMatchId?: Record<string, boolean>
    _payoutDoubledByMatchAndParticipant?: Record<string, Record<string, boolean>>
}
