import { NextResponse } from 'next/server'
import { getDuel } from '@/server/db/repositories/duels.repo'

type Params = { params: { id: string } }

export async function GET(_: Request, { params }: Params) {
    const d = await getDuel(params.id)
    if (!d) return NextResponse.json({ message: 'Not found' }, { status: 404 })
    return NextResponse.json(d)
}
