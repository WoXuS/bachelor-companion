import type {EggForApi} from '@/server/db/services/easter-eggs.service'

export function toPublicEgg(
    egg: EggForApi,
    counts: {total: number; found: number; remaining: number},
) {
    return {
        id: egg.id,
        number: egg.number,
        type: egg.type,
        active: egg.active,
        label: egg.label,
        claimedAt: egg.claimedAt,
        claimedBy: egg.claimedBy,
        counts,
    }
}
