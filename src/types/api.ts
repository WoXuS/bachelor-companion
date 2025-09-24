import {TournamentType} from '@/types/tournament'
import {TTournament, TMatch} from '@/types/tournament'

export type TeamInput = { name: string; memberIds: string[] }

export type Ctx<T extends Record<string, string> = Record<string, string>> =
    | { params: T }
    | { params: Promise<T> }

export async function getParams<T extends Record<string, string>>(ctx: Ctx<T>): Promise<T> {
    // @ts-expect-error runtime check
    const p = ctx.params
    // @ts-expect-error runtime check
    return typeof p?.then === 'function' ? await p : p
}


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
type BasicsWhenStarted = {
    title: string
    mainPrize: number
}

type BasicsBeforeStart = BasicsWhenStarted & {
    matchWinPrize: number
    consolationPrize: number
}

export type UpdateTournamentBasicsPayload =
    | BasicsWhenStarted
    | BasicsBeforeStart

export type UpdateTournamentParticipantsPayload =
    | { type: TournamentType.SOLO; participantIds: string[] }
    | { type: TournamentType.TEAM; teamA: TeamInput; teamB: TeamInput }

export type ApiError = { message: string }

export type TournamentListItemDto = {
    id: string
    title: string
    type: 'SOLO' | 'TEAM'
    mainPrize: number
    matchWinPrize: number
    consolationPrize: number
    matches?: Array<{
        id: string
        round: number
        indexInRound: number
        bracket?: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL' | null
        nextMatchId?: string | null
        participantAId?: string | null
        participantBId?: string | null
        winnerParticipantId?: string | null
        teamAId?: string | null
        teamBId?: string | null
        winnerTeamId?: string | null
        isBye: boolean
    }>
    participants: Array<{ participantId: string; participant: { id: string; name: string } }>
    teams: Array<{ id: string; name: string }>
}