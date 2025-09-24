import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'
import {Ctx, getParams} from "@/types/api";


export async function DELETE(_req: Request, ctx: Ctx<{ id: string }>) {
    const { id } = await getParams(ctx)

    await prisma.participant.delete({ where: { id: id } })
    return NextResponse.json({ ok: true })
}
