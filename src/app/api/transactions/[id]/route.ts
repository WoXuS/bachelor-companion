import {NextResponse} from "next/server";
import {deleteTransaction} from "@/server/db/repositories/transaction.repo";
import {errMsg} from "@/lib/error";
type Params = { params: { id: string } }

export async function DELETE(_: Request, { params }: Params) {
    try {
        const res = await deleteTransaction(params.id)
        return NextResponse.json(res)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
