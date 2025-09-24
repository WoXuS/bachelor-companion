import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

import {createHash} from "crypto"

const NAMESPACE_V1 = "EASTER_EGG_NAMESPACE_v1"

function base36FromHexPrefix(hex: string, bytes: number) {
    const slice = hex.slice(0, bytes * 2)
    const val = BigInt("0x" + slice)
    return val.toString(36).toUpperCase()
}

export function codeForEgg(num: number, type: "PHYSICAL" | "VIRTUAL", len = 7) {
    const h = createHash("sha256")
        .update(`${NAMESPACE_V1}:${type}:${num}`, "utf8")
        .digest("hex")

    const body = base36FromHexPrefix(h, 5).slice(0, len)
    return `${type === "PHYSICAL" ? "P" : "V"}-${body}`
}

function pad(n: number, width = 3) {
    const s = String(n)
    return s.length >= width ? s : "0".repeat(width - s.length) + s
}

export async function seedEasterEggs() {
    for (let i = 1; i <= 15; i++) {
        const num = i + 100;
        await prisma.easterEgg.upsert({
            where: {number: num},
            update: {},
            create: {
                number: num,
                type: "PHYSICAL",
                code: codeForEgg(i, "PHYSICAL", 7),
                label: `Fizyczny #${pad(i)}`,
                active: true,
            },
        })
    }

    const virtuals = [
        {number: 1, label: "Jajo dla czytających do końca", placementKey: "shop"},
        {number: 2, label: "Zostało mi już tylko jedno", placementKey: "ranking-last"},
        {
            number: 3,
            label: "Ups, a skąd to się tu wzięło (czaicie, bo egg to jajo. Tea bag, hehe)",
            placementKey: "ranking-first"
        },
        {number: 4, label: "Jajo dla grzebiących na stronie", placementKey: "admin-page"},
        {number: 5, label: "Jajo dla bardzo grzebiących na stronie", placementKey: "admin-page-2"},
        {number: 6, label: "Jajo dla czytających do końca", placementKey: "how-to-earn"},
        {number: 7, label: "Jajo dla eksploratora strony", placementKey: "duels"},
        {number: 8, label: "Damn, chłop już drabinkę przegranych przegląda", placementKey: "losers"},
    ]
    for (const v of virtuals) {
        await prisma.easterEgg.upsert({
            where: {number: v.number},
            update: {placementKey: v.placementKey ?? null},
            create: {
                number: v.number,
                type: "VIRTUAL",
                code: codeForEgg(v.number, "VIRTUAL", 7),
                label: v.label,
                active: true,
                placementKey: v.placementKey,
            },
        })
    }
}

async function main() {
    await seedEasterEggs()

    const names = [
        {name: 'Antoni', avatarUrl: '/images/participants/antoni.png', balance: 100},
        {name: 'Borys', avatarUrl: '/images/participants/borys.png', balance: 100},
        {name: 'Cezary', avatarUrl: '/images/participants/cezary.png', balance: 100},
        {name: 'Damian', avatarUrl: '/images/participants/damian.png', balance: 100},
        {name: 'Emil', avatarUrl: '/images/participants/emil.png', balance: 100},
        {name: 'Filip', avatarUrl: '/images/participants/filip.png', balance: 100},
        {name: 'Gabriel', avatarUrl: '/images/participants/gabriel.png', balance: 100},
        {name: 'Henryk', avatarUrl: '/images/participants/henryk.png', balance: 100},
        {name: 'Igor', avatarUrl: '/images/participants/igor.png', balance: 100},
        {name: 'Julian', avatarUrl: '/images/participants/julian.png', balance: 100},
        {name: 'Konrad', avatarUrl: '/images/participants/konrad.png', balance: 100},
        {name: 'Leon', avatarUrl: '/images/participants/leon.png', balance: 100},
    ]

    await Promise.all(
        names.map(p =>
            prisma.participant.upsert({
                where: {name: p.name},
                update: {avatarUrl: p.avatarUrl ?? null},
                create: {name: p.name, avatarUrl: p.avatarUrl ?? null, balance: 0, active: true},
            })
        )
    )

    const items = [
        {key: 'give-shot', label: 'Każ komuś wypić szota', cost: 50, category: 'troll'},
        {key: 'swimming-goggles', label: 'Okulary do pływania przez 10 minut', cost: 100, category: 'troll'},
        {key: 'jump-lake', label: 'Każ komuś zanurzyć głowę w jeziorze', cost: 200, category: 'troll'},
        {key: 'switch-opponent', label: 'Zmień komuś przeciwnika w meczu', cost: 100, category: 'troll'},
        {key: 'left-hand', label: 'Lewa ręka – kara w następnym meczu', cost: 150, category: 'troll'},
        {key: 'immunity', label: 'Immunitet (nikt Ci nie przeszkadza do końca mini-gry)', cost: 150, category: 'buff'},
        {key: 'double-points-4', label: 'Double Points (4 kolejne mecze turniejowe)', cost: 170, category: 'buff'},
        {key: 'change-opponent', label: 'Zmień sobie przeciwnika w meczu', cost: 100, category: 'buff'},
    ]


    await prisma.shopConfig.upsert({
        where: {id: 'singleton'},
        update: {},
        create: {id: 'singleton', discountsEnabled: false, discountPercent: 20},
    })

    await Promise.all(
        items.map(item =>
            prisma.shopItem.upsert({
                where: {key: item.key},
                update: {label: item.label, cost: item.cost, category: item.category},
                create: item
            })
        )
    )

    const prizes = [
        {
            place: 1,
            title: 'Koszulka wyjazdowa',
            description: 'Customowa koszulka przygotowana specjalnie na wyjazd',
            imageUrl: '/images/prizes/shirt.png',
        },
        {
            place: 2,
            title: 'Bimber + czapka wyjazdowa',
            description: 'Domowy bimber i czapka jako zestaw pocieszenia',
            imageUrl: '/images/prizes/hat.png',
        },
        {
            place: 3,
            title: 'Symboliczna nagroda',
            description: 'Niespodzianka od ekipy',
            imageUrl: '/images/prizes/surprise.png',
        },
    ]

    await Promise.all(
        prizes.map(p =>
            prisma.prize.upsert({
                where: {place: p.place},
                update: {title: p.title, description: p.description, imageUrl: p.imageUrl ?? null},
                create: p
            })
        )
    )

    const groom = await prisma.participant.findFirst({where: {name: 'Antoni'}})
    const bestman = await prisma.participant.findFirst({where: {name: 'Borys'}})
    if (groom) {
        await prisma.$transaction(async (tx) => {
            const fresh = await tx.participant.findUnique({
                where: {id: groom.id},
                select: {balance: true},
            })
            const amount = 50
            const newBalance = (fresh?.balance ?? 0) + amount

            await tx.transaction.create({
                data: {
                    participantId: groom.id,
                    amount,
                    reason: 'Pan młody starter pack',
                    balanceAfter: newBalance,
                },
            })
            await tx.participant.update({
                where: {id: groom.id},
                data: {balance: newBalance},
            })
        })

        if (bestman) {
            await prisma.shopConfig.upsert({
                where: {id: 'singleton'},
                update: {
                    groomParticipantId: groom?.id ?? null,
                    audienceExcludeIds: (groom?.id && bestman?.id) ? [groom.id, bestman.id] : (groom?.id ? [groom.id] : []),
                },
                create: {
                    id: 'singleton',
                    discountsEnabled: false,
                    discountPercent: 0,
                    groomParticipantId: groom?.id ?? null,
                    audienceExcludeIds: (groom?.id && bestman?.id) ? [groom.id, bestman.id] : (groom?.id ? [groom.id] : []),
                },
            })
            const audienceQuestions =[
                'Kim Antoni chciał być jak był mały?',
                'Jaki Antoni ma rozmiar buta?',
                'Jaki był najbardziej szalony/impulsywny zakup Antoniego?',
                'Jakie jest ulubione śniadanie Antoniego?',
                'Jakie są wymarzone wakacje Antoniego?',
                'Ile Antoni chciałby mieć dzieci?',
                'Jaki jest ulubiony film Antoniego?',
                'Jaka jest ulubiona bajka z dzieciństwa Antoniego?',
                'Jaki jest ulubiony kolor Antoniego?',
                'Jaką supermoc wybrałby Antoni?',
                'Jaki jest wymarzony samochód Antoniego?',
            ]

            const groomQuestions = [
                'Jaka jest ulubiona piosenka Niny?',
                'Jakie są ulubione kwiaty Niny?',
                'Gdzie była wasza pierwsza randka?',
                'Jaka jest ulubiona potrawa Niny?',
                'Co Nina kolekcjonowała w dzieciństwie?',
                'Jaki jest największy lęk Niny?',
                'Jaka jest ulubiona bajka Disneya Niny?',
                'Co Nina najbardziej w Tobie lubi?',
                'Jakiego nawyku nie lubi w Tobie Nina?',
                'Jaki daliście sobie prezent na pierwszą rocznicę?',
                'Kim Nina chciała zostać za dzieciaka?',
                'Jakie jest wasze wspólne marzenie na najbliższe lata?',
                'Jakie jest wasze wspólne marzenie na najbliższe lata? (z pominięciem domu)'
            ]
            const groomQs = groomQuestions.map((question, i) => ({
                kind: 'GROOM' as const,
                number: i + 1,
                text: question,
                audioUrl: `/audio/groom/question-${i + 1}.mp3`,
            }))
            for (const q of groomQs) {
                await prisma.quizQuestion.upsert({
                    where: {kind_number: {kind: 'GROOM', number: q.number}},
                    update: {text: q.text, audioUrl: q.audioUrl, active: true, answeredAt: null, groomCorrect: null},
                    create: q,
                })
            }

            const audienceQs = audienceQuestions.map((question, i) => ({
                kind: 'AUDIENCE' as const,
                number: i + 1,
                text: question,
                audioUrl: `/audio/audience/question-${i + 1}.mp3`,
            }))
            for (const q of audienceQs) {
                await prisma.quizQuestion.upsert({
                    where: {kind_number: {kind: 'AUDIENCE', number: q.number}},
                    update: {
                        text: q.text,
                        audioUrl: q.audioUrl,
                        active: true,
                        answeredAt: null,
                        awardedParticipantId: null
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
    }
}

main().then(async () => {
    console.log('Seed done')
    await prisma.$disconnect()
}).catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
})
