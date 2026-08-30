import {defineRoute} from '@/server/api/route'
import {idParams} from '@/server/api/schemas'
import {deleteTransaction} from '@/server/db/repositories/transaction.repo'

export const DELETE = defineRoute({
    admin: true,
    params: idParams,
    handler: ({params}) => deleteTransaction(params.id),
})
