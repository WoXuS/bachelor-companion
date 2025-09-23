import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET() {
    const eggs = await prisma.easterEgg.findMany({
        orderBy: [{ type: 'asc' }, { number: 'asc' }],
        include: { claimedBy: { select: { id: true, name: true } } },
    })
    return NextResponse.json(eggs.map(e => ({
        id: e.id, number: e.number, type: e.type, active: e.active,
        claimedAt: e.claimedAt, claimedBy: e.claimedBy, label: e.label ?? null,
    })))
}
