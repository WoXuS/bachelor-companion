import {NextResponse} from 'next/server'
import {listTransactions} from "@/server/db/repositories/transaction.repo";

export async function GET(req: Request) {
    const {searchParams} = new URL(req.url)
    const participantId = searchParams.get('participantId') || undefined
    const order = (searchParams.get('order') as 'asc' | 'desc') || 'desc'

    const data = await listTransactions({participantId, order})
    return NextResponse.json(data)
}
