import {NextResponse} from "next/server";
import {deleteTransaction} from "@/server/db/repositories/transaction.repo";
type Params = { params: { id: string } }

export async function DELETE(_: Request, { params }: Params) {
    try {
        const res = await deleteTransaction(params.id)
        return NextResponse.json(res)
    } catch (e: any) {
        return NextResponse.json({ message: e.message ?? 'Delete failed' }, { status: 400 })
    }
}
