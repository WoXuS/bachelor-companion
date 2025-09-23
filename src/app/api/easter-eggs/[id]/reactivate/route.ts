import { NextResponse } from 'next/server'
import { reactivateEgg } from '@/server/db/services/easter-eggs.service'
import { isAdminServer } from '@/lib/session'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    try {
        if (!isAdminServer()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const res = await reactivateEgg(params.id)
        return NextResponse.json(res)
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Failed' }, { status: 400 })
    }
}
