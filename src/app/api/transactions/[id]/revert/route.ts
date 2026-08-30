import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {revertTransaction} from '@/server/db/repositories/transaction.repo'

export const POST = defineRoute({
    admin: true,
    params: idParams,
    handler: ({params}) => revertTransaction(params.id),
})
