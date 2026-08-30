import {defineRoute} from '@/server/api/route'
import {getAudienceStandings} from '@/server/db/services/quiz.service'

export const GET = defineRoute({handler: () => getAudienceStandings()})
