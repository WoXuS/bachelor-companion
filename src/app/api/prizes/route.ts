import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET() {
    const prizes = await prisma.prize.findMany({ orderBy: { place: 'asc' } })
    return NextResponse.json(prizes)
}
