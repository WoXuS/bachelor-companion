import { NextResponse } from 'next/server'
import { prisma } from '@/server/db/prisma'

export async function GET() {
    const rows = await prisma.participant.findMany({ orderBy: { createdAt: 'asc' } })
    return NextResponse.json(rows)
}

export async function POST(req: Request) {
    const data = await req.json()
    if (data.id) {
        const updated = await prisma.participant.update({
            where: { id: data.id },
            data: { name: data.name, avatarUrl: data.avatarUrl },
        })
        return NextResponse.json(updated)
    }
    const created = await prisma.participant.create({
        data: { name: data.name, avatarUrl: data.avatarUrl },
    })
    return NextResponse.json(created)
}
