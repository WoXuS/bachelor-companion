export type EasterEggDto = {
    id: string
    number: number
    type: 'PHYSICAL' | 'VIRTUAL'
    active: boolean
    claimedAt?: string | null
    claimedBy?: { id: string; name: string } | null
    label?: string | null
}
