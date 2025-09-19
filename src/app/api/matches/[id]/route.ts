import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

type Params = { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
    const { bestOf } = await req.json()
    if (![1,3,5].includes(bestOf)) return NextResponse.json({ message: 'Invalid bestOf' }, { status: 400 })
    const m = await prisma.match.update({ where: { id: params.id }, data: { bestOf } })
    return NextResponse.json(m)
}
