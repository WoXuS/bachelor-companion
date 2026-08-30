import {z} from 'zod'
import {defineRoute} from '@/server/api/route'
import {getNextQuestion} from '@/server/db/services/quiz.service'

const kindSchema = z.enum(['GROOM', 'AUDIENCE'])

export const GET = defineRoute({
    handler: ({req}) => getNextQuestion(kindSchema.parse(req.nextUrl.searchParams.get('kind'))),
})
