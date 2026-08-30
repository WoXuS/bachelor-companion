import {defineRoute} from '@/server/api/route'
import {listPrizes} from '@/server/db/repositories/prizes.repo'

export const GET = defineRoute({handler: () => listPrizes()})
