import {defineRoute} from '@/server/api/route'
import {undoLastAudience} from '@/server/db/services/quiz.service'

export const POST = defineRoute({admin: true, handler: () => undoLastAudience()})
