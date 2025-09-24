import {NextRequest, NextResponse} from 'next/server'
import { prisma } from '@/server/db/prisma'
import {isAdminFromRequest} from '@/lib/session'
import {errMsg} from "@/lib/error";
import {Ctx, getParams} from "@/types/api";

export async function PUT(req: NextRequest, ctx: Ctx<{ id: string }>) {
    try {
        const { id } = await getParams(ctx)
        if (!isAdminFromRequest(req)) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const { placementKey } = await req.json() as { placementKey?: string | null }

        if (placementKey) {
            await prisma.easterEgg.updateMany({
                where: { placementKey },
                data: { placementKey: null },
            })
        }

        const updated = await prisma.easterEgg.update({
            where: { id: id },
            data: { placementKey: placementKey ?? null },
            select: { id: true, placementKey: true },
        })
        return NextResponse.json(updated)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 500 })
    }
}
