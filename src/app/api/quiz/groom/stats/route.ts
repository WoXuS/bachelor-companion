import {defineRoute} from '@/server/api/route'
import {getGroomStats} from '@/server/db/services/quiz.service'

export const GET = defineRoute({handler: () => getGroomStats()})
