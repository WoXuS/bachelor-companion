import type {Tx} from '../transaction'
import {
    BEST_MAN_NAME,
    GROOM_NAME,
    PHYSICAL_EGG_COUNT,
    PHYSICAL_EGG_NUMBER_OFFSET,
    audienceQuestions,
    codeForEgg,
    groomQuestions,
    participants,
    prizes,
    shopItems,
    virtualEggs,
} from './fixtures'

export async function seedEasterEggs(tx: Tx) {
    for (let i = 1; i <= PHYSICAL_EGG_COUNT; i++) {
        const number = i + PHYSICAL_EGG_NUMBER_OFFSET
        await tx.easterEgg.upsert({
            where: {number},
            update: {},
            create: {
                number,
                type: 'PHYSICAL',
                code: codeForEgg(i, 'PHYSICAL'),
                label: `Fizyczny #${String(i).padStart(3, '0')}`,
                active: true,
            },
        })
    }

    for (const egg of virtualEggs) {
        await tx.easterEgg.upsert({
            where: {number: egg.number},
            update: {placementKey: egg.placementKey},
            create: {
                number: egg.number,
                type: 'VIRTUAL',
                code: codeForEgg(egg.number, 'VIRTUAL'),
                label: egg.label,
                active: true,
                placementKey: egg.placementKey,
            },
        })
    }
}

export async function seedParticipants(tx: Tx) {
    for (const p of participants) {
        await tx.participant.upsert({
            where: {name: p.name},
            update: {avatarUrl: p.avatarUrl},
            create: {name: p.name, avatarUrl: p.avatarUrl, balance: p.balance, active: true},
        })
    }
}

export async function seedShop(tx: Tx) {
    for (const item of shopItems) {
        await tx.shopItem.upsert({
            where: {key: item.key},
            update: {label: item.label, cost: item.cost, category: item.category},
            create: item,
        })
    }
}

export async function seedPrizes(tx: Tx) {
    for (const prize of prizes) {
        await tx.prize.upsert({
            where: {place: prize.place},
            update: {title: prize.title, description: prize.description},
            create: prize,
        })
    }
}

export async function seedQuiz(tx: Tx, groomId: string, excludeIds: string[]) {
    await tx.shopConfig.upsert({
        where: {id: 'singleton'},
        update: {groomParticipantId: groomId, audienceExcludeIds: excludeIds},
        create: {
            id: 'singleton',
            discountsEnabled: false,
            discountPercent: 0,
            groomParticipantId: groomId,
            audienceExcludeIds: excludeIds,
        },
    })

    const questions = [
        ...groomQuestions.map((text, i) => ({kind: 'GROOM' as const, number: i + 1, text})),
        ...audienceQuestions.map((text, i) => ({kind: 'AUDIENCE' as const, number: i + 1, text})),
    ]

    for (const q of questions) {
        await tx.quizQuestion.upsert({
            where: {kind_number: {kind: q.kind, number: q.number}},
            update: {
                text: q.text,
                active: true,
                answeredAt: null,
                groomCorrect: null,
                awardedParticipantId: null,
            },
            create: q,
        })
    }

    await tx.quizMeta.upsert({
        where: {id: 'singleton'},
        update: {audienceBonusGranted: false},
        create: {id: 'singleton', audienceBonusGranted: false},
    })
}

export async function seedBaseData(tx: Tx) {
    await seedEasterEggs(tx)
    await seedParticipants(tx)
    await seedShop(tx)
    await seedPrizes(tx)

    const [groom, bestMan] = await Promise.all([
        tx.participant.findUniqueOrThrow({where: {name: GROOM_NAME}}),
        tx.participant.findUniqueOrThrow({where: {name: BEST_MAN_NAME}}),
    ])

    await seedQuiz(tx, groom.id, [groom.id, bestMan.id])
}
