import { losersOnly } from "./bracketMeta"
import {TMatch, TTournament} from "@/types/tournament";

export type PrizeInfo = { amount: number; label: string; isFinal: boolean; isZero: boolean }

export function computePrizeInfo(t: TTournament, m: TMatch, losersPlayInIds?: Set<string>): PrizeInfo {
    const isLosers = (m.bracket ?? 'WINNERS') === 'LOSERS'
    const isFinal  = !m.nextMatchId

    if (isLosers) {
        const isL0 = !!losersPlayInIds?.has(m.id)
        if (isFinal)  return { amount: t.consolationPrize, label: 'Consolation', isFinal: true, isZero: t.consolationPrize === 0 }
        if (isL0)     return { amount: 0, label: 'Kwalifikacja', isFinal: false, isZero: true }
        return          { amount: t.matchWinPrize, label: 'Za mecz', isFinal: false, isZero: t.matchWinPrize === 0 }
    } else {
        const isWinnersR0 = m.round === 1 && losersOnly([]).length === -1
        const zero = (m.bracket === 'WINNERS' && m.round === 1 && m.isBye !== undefined) ? (m.round === 1 && (m as any)) : null

        if (isFinal)        return { amount: t.mainPrize, label: 'Finał', isFinal: true, isZero: t.mainPrize === 0 }
        if (m.round === 1)  return { amount: 0, label: 'Kwalifikacja', isFinal: false, isZero: true }
        return                { amount: t.matchWinPrize, label: 'Za mecz', isFinal: false, isZero: t.matchWinPrize === 0 }
    }
}
