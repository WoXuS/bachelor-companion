import { NextResponse } from 'next/server'
import { getEggByPlacement } from '@/server/db/services/easter-eggs.service'

export async function GET(_req: Request, { params }: { params: { key: string } }) {
    try {
        const egg = await getEggByPlacement(params.key)
        return NextResponse.json(egg ?? null)
    } catch (e: any) {
        return NextResponse.json({ message: e?.message ?? 'Failed' }, { status: 500 })
    }
}
