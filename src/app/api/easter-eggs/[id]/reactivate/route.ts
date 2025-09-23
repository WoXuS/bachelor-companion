import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function POST(_: Request, { params }: { params: { id: string } }) {
    try {
        const egg = await prisma.easterEgg.findUnique({ where: { id: params.id } })
        if (!egg) return NextResponse.json({ message: 'Nie znaleziono' }, { status: 404 })
        if (egg.type !== 'PHYSICAL') return NextResponse.json({ message: 'Tylko dla fizycznych' }, { status: 400 })

        const updated = await prisma.easterEgg.update({
            where: { id: egg.id },
            data: { active: true, claimedAt: null, claimedById: null },
        })
        return NextResponse.json({ ok: true, id: updated.id })
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Reactivate failed' }, { status: 400 })
    }
}
