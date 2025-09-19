import { NextResponse } from 'next/server'
import { getDuel } from '@/server/db/repositories/duels.repo'
import {prisma} from "@/server/db/prisma";

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
    const d = await getDuel(params.id)
    if (!d) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(d)
}

export async function PATCH(req: Request, { params }: Params) {
    const { bestOf } = await req.json()
    if (![1,3,5].includes(bestOf)) return NextResponse.json({ message: 'Invalid bestOf' }, { status: 400 })
    const m = await prisma.duel.update({ where: { id: params.id }, data: { bestOf } })
    return NextResponse.json(m)
}