import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET(_: Request, { params }: { params: { id: string } }) {
    const egg = await prisma.easterEgg.findUnique({
        where: { id: params.id },
        include: { claimedBy: { select: { id: true, name: true } } },
    })
    if (!egg) return NextResponse.json({ message: 'Nie znaleziono' }, { status: 404 })
    return NextResponse.json({
        id: egg.id,
        number: egg.number,
        type: egg.type,
        active: egg.active,
        claimedAt: egg.claimedAt,
        claimedBy: egg.claimedBy,
        label: egg.label ?? null,
    })
}
