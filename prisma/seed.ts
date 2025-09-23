import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function seedEasterEggs({ physical = 12, virtual = 8 }: { physical?: number; virtual?: number }) {
    const toCreate = []
    let n = 1
    for (let i = 0; i < physical; i++) {
        toCreate.push({ number: n++, type: 'PHYSICAL' as const, active: true })
    }
    for (let i = 0; i < virtual; i++) {
        toCreate.push({ number: n++, type: 'VIRTUAL' as const, active: true })
    }
    for (const e of toCreate) {
        await prisma.easterEgg.upsert({
            where: { number: e.number },
            update: {},
            create: e,
        })
    }
}

async function main() {
    await seedEasterEggs({ physical: 12, virtual: 8 })

    const names = [
        {name: 'Antoni', avatarUrl: '/images/participants/antoni.png', balance: 10},
        {name: 'Borys', avatarUrl: '/images/participants/borys.png', balance: 10},
        {name: 'Cezary', avatarUrl: '/images/participants/cezary.png', balance: 10},
        {name: 'Damian', avatarUrl: '/images/participants/damian.png', balance: 10},
        {name: 'Emil', avatarUrl: '/images/participants/emil.png', balance: 10},
        {name: 'Filip', avatarUrl: '/images/participants/filip.png', balance: 10},
        {name: 'Gabriel', avatarUrl: '/images/participants/gabriel.png', balance: 10},
        {name: 'Henryk', avatarUrl: '/images/participants/henryk.png', balance: 10},
        {name: 'Igor', avatarUrl: '/images/participants/igor.png', balance: 10},
        {name: 'Julian', avatarUrl: '/images/participants/julian.png', balance: 10},
        {name: 'Konrad', avatarUrl: '/images/participants/konrad.png', balance: 10},
        {name: 'Leon', avatarUrl: '/images/participants/leon.png', balance: 10},
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
        {key: 'give-shot', label: 'Każ komuś wypić szota', cost: 50, category: 'przeszkadzanie'},
        {key: 'swimming-goggles', label: 'Okulary do pływania przez 10 minut', cost: 100, category: 'przeszkadzanie'},
        {key: 'jump-lake', label: 'Zanurzenie głowy / skok do jeziora', cost: 150, category: 'przeszkadzanie'},
        {key: 'switch-opponent', label: 'Zmiana przeciwnika w następnym meczu', cost: 100, category: 'przeszkadzanie'},
        {key: 'left-hand', label: 'Lewa ręka – kara w następnym meczu', cost: 150, category: 'przeszkadzanie'},
        {key: 'freeze-casino', label: 'Zamrożenie hazardu na 10 min', cost: 150, category: 'przeszkadzanie'},

        {key: 'immunity', label: 'Immunitet (nikt Ci nie przeszkadza do końca mini-gry)', cost: 150, category: 'buff'},
        {key: 'double-points-4', label: 'Double Points (4 kolejne mecze turniejowe)', cost: 120, category: 'buff'},
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
    if (groom) {
        await prisma.$transaction(async (tx) => {
            const fresh = await tx.participant.findUnique({
                where: {id: groom.id},
                select: {balance: true},
            })
            const amount = 10
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
