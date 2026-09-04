'use client'

import {useQuery} from '@tanstack/react-query'
import {apiGet} from '@/lib/api-client'
import type {ParticipantDto} from '@/types/participant'

export const queryKeys = {
    me: ['me'] as const,
    demoStatus: ['demo-status'] as const,
    participants: ['participants'] as const,
    ranking: ['ranking'] as const,
    transactions: ['transactions'] as const,
    shop: ['shop'] as const,
    shopConfig: ['shop-config'] as const,
    prizes: ['prizes'] as const,
    tournaments: ['tournaments'] as const,
    tournament: (id: string) => ['tournament', id] as const,
    duels: ['duels'] as const,
    duel: (id: string) => ['duel', id] as const,
    eggs: ['eggs'] as const,
    egg: (id: string) => ['egg', id] as const,
    eggByCode: (code: string) => ['egg-by-code', code] as const,
    eggSlot: (placementKey: string) => ['egg-slot', placementKey] as const,
    quizNext: (kind: 'GROOM' | 'AUDIENCE') => ['quiz-next', kind] as const,
    groomStats: ['quiz-groom-stats'] as const,
    audienceStandings: ['aud-standings'] as const,
}

export const fetchParticipants = () => apiGet<ParticipantDto[]>('/api/participants')

export function useParticipants(options?: {enabled?: boolean}) {
    return useQuery({
        queryKey: queryKeys.participants,
        queryFn: fetchParticipants,
        enabled: options?.enabled ?? true,
    })
}

export function useAdmin() {
    return useQuery({
        queryKey: queryKeys.me,
        queryFn: () => apiGet<{isAdmin: boolean}>('/api/auth/me'),
        staleTime: 30_000,
    })
}
