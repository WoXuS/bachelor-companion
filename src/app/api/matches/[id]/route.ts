import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'
import {Ctx, getParams} from "@/types/api";


export async function PATCH(req: Request, ctx: Ctx<{ id: string }>) {
    const { id } = await getParams(ctx)
    const { bestOf } = await req.json()
    if (![1,3,5].includes(bestOf)) return NextResponse.json({ message: 'Invalid bestOf' }, { status: 400 })
    const m = await prisma.match.update({ where: { id: id }, data: { bestOf } })
    return NextResponse.json(m)
}
