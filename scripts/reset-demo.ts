import {resetDemoData} from '../src/server/db/seed/demo'
import {prisma} from '../src/server/db/prisma'

resetDemoData()
    .then((result) => console.log('Demo reset done', result))
    .catch((e) => {
        console.error(e)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
