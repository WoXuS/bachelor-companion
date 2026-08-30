import {defineRoute} from '@/server/api/route'
import {getRanking} from '@/server/db/services/ranking.service'

export const GET = defineRoute({handler: () => getRanking()})
