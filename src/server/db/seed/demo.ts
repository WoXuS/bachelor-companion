import {prisma} from '../prisma'
import {Tx, withTx} from '../transaction'
import {seedBaseData} from './index'
import {GROOM_NAME} from './fixtures'
import {
    createConsolationBracket,
    createSoloTournament,
    reportMatch,
} from '../services/tournaments.service'
import {addTransaction, purchaseFor, transferBetween} from '../services/economy.service'
import {claimEgg} from '../services/easter-eggs.service'
import {awardAudience, markGroom} from '../services/quiz.service'
import {getNextQuestion} from '../services/quiz.service'
import {updateShopConfig} from '../services/pricing.service'
import {updateShopItem} from '../repositories/shop.repo'

const DEMO_TOURNAMENT_TITLE = 'Turniej w rzutki'

async function wipe(tx: Tx) {
    await tx.participantBuffUsage.deleteMany()
    await tx.participantBuff.deleteMany()
    await tx.transaction.deleteMany()
    await tx.match.deleteMany()
    await tx.tournamentTeamMember.deleteMany()
    await tx.tournamentTeam.deleteMany()
    await tx.tournamentParticipant.deleteMany()
    await tx.tournament.deleteMany()
    await tx.duel.deleteMany()
    await tx.quizQuestion.deleteMany()
    await tx.quizMeta.deleteMany()
    await tx.easterEgg.deleteMany()
    await tx.shopConfig.deleteMany()
    await tx.shopItem.deleteMany()
    await tx.prize.deleteMany()
    await tx.participant.deleteMany()
}

async function reportRound(tournamentId: string, round: number, bracket: 'WINNERS' | 'LOSERS') {
    const pending = await prisma.match.findMany({
        where: {
            tournamentId,
            bracket,
            round,
            isBye: false,
            winnerParticipantId: null,
            participantAId: {not: null},
            participantBId: {not: null},
        },
        orderBy: {indexInRound: 'asc'},
    })

    for (const [i, match] of pending.entries()) {
        const winner = i % 3 === 0 ? 'B' : 'A'
        const [hi, lo] = match.bestOf === 1 ? [1, 0] : match.bestOf === 3 ? [2, 1] : [3, 2]
        await reportMatch({
            matchId: match.id,
            winner,
            scoreA: winner === 'A' ? hi : lo,
            scoreB: winner === 'B' ? hi : lo,
        })
    }
}

async function buildTournament(participantIds: string[]) {
    const tournament = await createSoloTournament({
        title: DEMO_TOURNAMENT_TITLE,
        mainPrize: 300,
        matchWinPrize: 40,
        consolationPrize: 100,
        participantIds,
    })

    await reportRound(tournament.id, 1, 'WINNERS')
    await reportRound(tournament.id, 2, 'WINNERS')
    await createConsolationBracket(tournament.id)
    await reportRound(tournament.id, 1, 'LOSERS')
}

async function buildEconomy(byName: Record<string, string>) {
    const items = await prisma.shopItem.findMany()
    const shot = items.find((i) => i.key === 'give-shot')
    const doublePoints = items.find((i) => i.key === 'double-points-4')

    if (shot) {
        for (const who of ['Emil', 'Antoni']) {
            await purchaseFor(byName[who], shot.id).catch(() => undefined)
        }
    }

    if (doublePoints) {
        await addTransaction({
            participantId: byName['Cezary'],
            amount: 60,
            reason: 'Bonus za pomoc w organizacji',
        })
        await purchaseFor(byName['Cezary'], doublePoints.id).catch(() => undefined)
        await updateShopItem(doublePoints.id, {adjustOverrideEnabled: true, adjustPercent: 25})
    }

    await transferBetween({
        fromId: byName['Filip'],
        toId: byName['Gabriel'],
        amount: 40,
        reasonTo: 'Zakład o rzutki',
    }).catch(() => undefined)

    await updateShopConfig({discountsEnabled: true, discountPercent: 20})
}

async function buildQuiz(byName: Record<string, string>) {
    for (let i = 0; i < 4; i++) {
        const next = await getNextQuestion('GROOM')
        if (!next?.question) break
        await markGroom(next.question.id, i !== 2)
    }

    for (const who of ['Damian', 'Henryk', 'Konrad']) {
        const next = await getNextQuestion('AUDIENCE')
        if (!next?.question) break
        await awardAudience(next.question.id, byName[who])
    }
}

async function claimShopEgg(byName: Record<string, string>) {
    const egg = await prisma.easterEgg.findFirst({where: {placementKey: 'shop'}})
    if (egg) await claimEgg({id: egg.id}, byName['Julian']).catch(() => undefined)
}

export async function resetDemoData() {
    await withTx(
        async (tx) => {
            await wipe(tx)
            await seedBaseData(tx)
        },
        undefined,
        {timeout: 60_000},
    )

    const participants = await prisma.participant.findMany({orderBy: {createdAt: 'asc'}})
    const byName = Object.fromEntries(participants.map((p) => [p.name, p.id]))

    await buildTournament(participants.map((p) => p.id))
    await buildEconomy(byName)
    await buildQuiz(byName)
    await claimShopEgg(byName)

    return {
        participants: participants.length,
        groom: GROOM_NAME,
        resetAt: new Date().toISOString(),
    }
}
