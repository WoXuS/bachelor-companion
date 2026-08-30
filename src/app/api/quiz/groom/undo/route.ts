import {defineRoute} from '@/server/api/route'
import {undoLastGroom} from '@/server/db/services/quiz.service'

export const POST = defineRoute({admin: true, handler: () => undoLastGroom()})
