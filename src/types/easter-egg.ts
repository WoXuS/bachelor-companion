export type EasterEggDto = {
    id: string
    number: number
    type: 'PHYSICAL' | 'VIRTUAL'
    active: boolean
    label?: string | null
    counts?: { total: number; found: number; remaining: number }
    claimedAt?: string | null
    claimedBy?: { id: string; name: string } | null
    placementKey?: string | null
}
