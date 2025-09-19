export type DuelDto = {
    id: string
    title: string
    stake: number
    playerAId: string
    playerBId: string
    winnerId?: string | null
    scoreA?: number | null
    scoreB?: number | null
    createdAt: string
    finishedAt?: string | null
    playerA?: { id: string; name: string }
    playerB?: { id: string; name: string }
    winner?: { id: string; name: string } | null
}
