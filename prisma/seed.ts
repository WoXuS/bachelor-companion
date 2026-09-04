import {PrismaClient} from '@prisma/client'
import {seedBaseData} from '../src/server/db/seed'

const prisma = new PrismaClient()

prisma
    .$transaction((tx) => seedBaseData(tx), {timeout: 60_000})
    .then(() => console.log('Seed done'))
    .catch((e) => {
        console.error(e)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
