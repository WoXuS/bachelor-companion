import {NextResponse} from "next/server";
import {deleteTransaction} from "@/server/db/repositories/transaction.repo";
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";

export async function DELETE(_req: Request, ctx: Ctx<{ id: string }>) {
    const {id} = await getParams(ctx)

    try {
        const res = await deleteTransaction(id)
        return NextResponse.json(res)
    } catch (e: unknown) {
        return NextResponse.json({message: errMsg(e)}, {status: 400})
    }
}
