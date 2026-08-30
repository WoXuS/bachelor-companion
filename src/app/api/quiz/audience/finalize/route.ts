import {defineRoute} from '@/server/api/route'
import {finalizeAudienceBonus} from '@/server/db/services/quiz.service'

export const POST = defineRoute({admin: true, handler: () => finalizeAudienceBonus()})
