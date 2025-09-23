import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'
import { isAdminServer } from '@/lib/session'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        if (!isAdminServer()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const { placementKey } = await req.json() as { placementKey?: string | null }

        if (placementKey) {
            await prisma.easterEgg.updateMany({
                where: { placementKey },
                data: { placementKey: null },
            })
        }

        const updated = await prisma.easterEgg.update({
            where: { id: params.id },
            data: { placementKey: placementKey ?? null },
            select: { id: true, placementKey: true },
        })
        return NextResponse.json(updated)
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Failed' }, { status: 500 })
    }
}
