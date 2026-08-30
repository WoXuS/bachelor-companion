import {PrismaClient} from '@prisma/client'
import {createHash} from 'node:crypto'

const prisma = new PrismaClient()

const EGG_CODE_NAMESPACE = 'EASTER_EGG_NAMESPACE_v1'
const PHYSICAL_EGG_COUNT = 15
const PHYSICAL_EGG_NUMBER_OFFSET = 100
const STARTING_BALANCE = 100

export function codeForEgg(num: number, type: 'PHYSICAL' | 'VIRTUAL', len = 7) {
    const digest = createHash('sha256')
        .update(`${EGG_CODE_NAMESPACE}:${type}:${num}`, 'utf8')
        .digest('hex')
    const body = BigInt(`0x${digest.slice(0, 10)}`).toString(36).toUpperCase().slice(0, len)
    return `${type === 'PHYSICAL' ? 'P' : 'V'}-${body}`
}

const participants = [
    'Antoni', 'Borys', 'Cezary', 'Damian', 'Emil', 'Filip',
    'Gabriel', 'Henryk', 'Igor', 'Julian', 'Konrad', 'Leon',
].map(name => ({
    name,
    avatarUrl: `/images/participants/${name.toLowerCase()}.png`,
    balance: STARTING_BALANCE,
}))

const GROOM_NAME = 'Antoni'
const BEST_MAN_NAME = 'Borys'
const BRIDE_NAME = 'Nina'

const virtualEggs = [
    {number: 1, label: 'Jajo dla czytających cennik do końca', placementKey: 'shop'},
    {number: 2, label: 'Jajo ukryte w rankingu', placementKey: 'ranking-first'},
    {number: 3, label: 'Jajo dla przeglądających ranking do końca', placementKey: 'ranking-last'},
    {number: 4, label: 'Jajo dla grzebiących na stronie', placementKey: 'admin-page'},
    {number: 5, label: 'Jajo dla bardzo grzebiących na stronie', placementKey: 'admin-page-2'},
    {number: 6, label: 'Jajo dla czytających zasady do końca', placementKey: 'how-to-earn'},
    {number: 7, label: 'Jajo dla eksploratora pojedynków', placementKey: 'duels'},
    {number: 8, label: 'Jajo dla przeglądających drabinkę przegranych', placementKey: 'losers'},
]

const shopItems = [
    {key: 'give-shot', label: 'Każ komuś wypić shota', cost: 50, category: 'troll'},
    {key: 'swimming-goggles', label: 'Okulary do pływania przez 10 minut', cost: 100, category: 'troll'},
    {key: 'jump-lake', label: 'Każ komuś zanurzyć głowę w jeziorze', cost: 200, category: 'troll'},
    {key: 'switch-opponent', label: 'Zmień komuś przeciwnika w meczu', cost: 100, category: 'troll'},
    {key: 'left-hand', label: 'Lewa ręka – kara w następnym meczu', cost: 150, category: 'troll'},
    {key: 'immunity', label: 'Immunitet (nikt Ci nie przeszkadza do końca mini-gry)', cost: 150, category: 'buff'},
    {key: 'double-points-4', label: 'Double Points (4 kolejne mecze turniejowe)', cost: 170, category: 'buff'},
    {key: 'change-opponent', label: 'Zmień sobie przeciwnika w meczu', cost: 100, category: 'buff'},
]

const prizes = [
    {place: 1, title: 'Koszulka wyjazdowa', description: 'Customowa koszulka przygotowana na wyjazd'},
    {place: 2, title: 'Czapka wyjazdowa', description: 'Czapka jako zestaw pocieszenia'},
    {place: 3, title: 'Symboliczna nagroda', description: 'Niespodzianka od ekipy'},
]

const audienceQuestions = [
    `Kim ${GROOM_NAME} chciał być jak był mały?`,
    `Jaki ${GROOM_NAME} ma rozmiar buta?`,
    `Jaki był najbardziej impulsywny zakup ${GROOM_NAME}ego?`,
    `Jakie jest ulubione śniadanie ${GROOM_NAME}ego?`,
    `Jakie są wymarzone wakacje ${GROOM_NAME}ego?`,
    `Jaki jest ulubiony film ${GROOM_NAME}ego?`,
    `Jaka jest ulubiona bajka z dzieciństwa ${GROOM_NAME}ego?`,
    `Jaki jest ulubiony kolor ${GROOM_NAME}ego?`,
    `Jaką supermoc wybrałby ${GROOM_NAME}?`,
    `Jaki jest wymarzony samochód ${GROOM_NAME}ego?`,
    `Jaki jest ulubiony sport ${GROOM_NAME}ego?`,
]

const groomQuestions = [
    `Jaka jest ulubiona piosenka ${BRIDE_NAME}?`,
    `Jakie są ulubione kwiaty ${BRIDE_NAME}?`,
    'Gdzie była wasza pierwsza randka?',
    `Jaka jest ulubiona potrawa ${BRIDE_NAME}?`,
    `Co ${BRIDE_NAME} kolekcjonowała w dzieciństwie?`,
    `Jaka jest ulubiona bajka Disneya ${BRIDE_NAME}?`,
    `Jaki jest ulubiony serial ${BRIDE_NAME}?`,
    'Jaki daliście sobie prezent na pierwszą rocznicę?',
    `Kim ${BRIDE_NAME} chciała zostać jako dziecko?`,
    `Jaki jest wymarzony kierunek podróży ${BRIDE_NAME}?`,
    `Jaka jest ulubiona pora roku ${BRIDE_NAME}?`,
    'W którym mieście się poznaliście?',
]

async function seedEasterEggs() {
    for (let i = 1; i <= PHYSICAL_EGG_COUNT; i++) {
        const number = i + PHYSICAL_EGG_NUMBER_OFFSET
        await prisma.easterEgg.upsert({
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
        await prisma.easterEgg.upsert({
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

async function seedParticipants() {
    for (const p of participants) {
        await prisma.participant.upsert({
            where: {name: p.name},
            update: {avatarUrl: p.avatarUrl},
            create: {name: p.name, avatarUrl: p.avatarUrl, balance: p.balance, active: true},
        })
    }
}

async function seedShop() {
    for (const item of shopItems) {
        await prisma.shopItem.upsert({
            where: {key: item.key},
            update: {label: item.label, cost: item.cost, category: item.category},
            create: item,
        })
    }
}

async function seedPrizes() {
    for (const prize of prizes) {
        await prisma.prize.upsert({
            where: {place: prize.place},
            update: {title: prize.title, description: prize.description},
            create: prize,
        })
    }
}

async function seedQuiz(groomId: string, excludeIds: string[]) {
    await prisma.shopConfig.upsert({
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
        await prisma.quizQuestion.upsert({
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

    await prisma.quizMeta.upsert({
        where: {id: 'singleton'},
        update: {audienceBonusGranted: false},
        create: {id: 'singleton', audienceBonusGranted: false},
    })
}

async function main() {
    await seedEasterEggs()
    await seedParticipants()
    await seedShop()
    await seedPrizes()

    const [groom, bestMan] = await Promise.all([
        prisma.participant.findUniqueOrThrow({where: {name: GROOM_NAME}}),
        prisma.participant.findUniqueOrThrow({where: {name: BEST_MAN_NAME}}),
    ])

    await seedQuiz(groom.id, [groom.id, bestMan.id])
    console.log('Seed done')
}

main()
    .catch((e) => {
        console.error(e)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
