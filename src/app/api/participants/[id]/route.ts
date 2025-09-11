import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

type Params = { params: { id: string } }

export async function DELETE(_: Request, { params }: Params) {
    await prisma.participant.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
}
