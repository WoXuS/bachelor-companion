import {defineRoute} from '@/server/api/route'
import {listEggsForAdmin} from '@/server/db/services/easter-eggs.service'

export const GET = defineRoute({admin: true, handler: () => listEggsForAdmin()})
