import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
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
        {
            key: 'immunity',
            label: 'Immunitet (nikt Ci nie przeszkadza do końca mini-gry)',
            cost: 8,
            category: 'immunitet'
        },
        {key: 'give-shot', label: 'Każ komuś wypić szota', cost: 5, category: 'trolling'},
        {
            key: 'swimming-googles',
            label: 'Wyznaczasz kogoś do chodzenia w okularach do pływania przez 10 minut',
            cost: 6,
            category: 'trolling'
        },
        {key: 'jump-lake', label: 'Wyznaczasz kogoś do skoku do jeziora', cost: 10, category: 'trolling'},
    ]
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

    const groom = await prisma.participant.findFirst({ where: { name: 'Antoni' } })
    if (groom) {
        await prisma.$transaction(async (tx) => {
            const fresh = await tx.participant.findUnique({
                where: { id: groom.id },
                select: { balance: true },
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
                where: { id: groom.id },
                data: { balance: newBalance },
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
