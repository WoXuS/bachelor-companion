import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const names = [
        {name: 'Antoni', avatarUrl: '/images/participants/antoni.png'},
        {name: 'Borys', avatarUrl: '/images/participants/borys.png'},
        {name: 'Cezary', avatarUrl: '/images/participants/cezary.png'},
        {name: 'Damian', avatarUrl: '/images/participants/damian.png'},
        {name: 'Emil', avatarUrl: '/images/participants/emil.png'},
        {name: 'Filip', avatarUrl: '/images/participants/filip.png'},
        {name: 'Gabriel', avatarUrl: '/images/participants/gabriel.png'},
        {name: 'Henryk', avatarUrl: '/images/participants/henryk.png'},
        {name: 'Igor', avatarUrl: '/images/participants/igor.png'},
        {name: 'Julian', avatarUrl: '/images/participants/julian.png'},
        {name: 'Konrad', avatarUrl: '/images/participants/konrad.png'},
        {name: 'Leon', avatarUrl: '/images/participants/leon.png'},
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

    const groom = await prisma.participant.findFirst({where: {name: 'Antoni'}})
    if (groom) {
        await prisma.transaction.create({
            data: {participantId: groom.id, amount: 10, reason: 'Pan młody starter pack'}
        })
        await prisma.participant.update({where: {id: groom.id}, data: {balance: {increment: 10}}})
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
