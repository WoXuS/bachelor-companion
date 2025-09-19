import {NextResponse} from 'next/server'
import {prisma} from '@/server/db/prisma'
import {tournamentStarted} from '@/server/db/repositories/tournaments.repo'

type Params = { params: { id: string } }

export async function PUT(req: Request, {params}: Params) {
    const body = await req.json()
    const t = await prisma.tournament.findUnique({where: {id: params.id}})
    if (!t) return NextResponse.json({message: 'Not found'}, {status: 404})

    const started = await tournamentStarted(params.id)
    if (started) return NextResponse.json({message: 'Turniej już wystartował'}, {status: 400})

    return prisma.$transaction(async (tx) => {
        if (t.type === 'SOLO') {
            const ids: string[] = Array.isArray(body.participantIds) ? body.participantIds : []
            await tx.tournamentParticipant.deleteMany({where: {tournamentId: params.id}})
            if (ids.length) {
                await tx.tournamentParticipant.createMany({
                    data: ids.map(pid => ({tournamentId: params.id, participantId: String(pid)})),
                })
            }
        } else {
            const a = body.teamA as { name: string; memberIds: string[] }
            const b = body.teamB as { name: string; memberIds: string[] }
            const teams = await tx.tournamentTeam.findMany({
                where: {tournamentId: params.id},
                orderBy: {createdAt: 'asc'}
            })
            if (teams.length !== 2) return NextResponse.json({message: 'Oczekiwano 2 zespołów'}, {status: 400})

            await tx.tournamentTeam.update({where: {id: teams[0].id}, data: {name: String(a?.name ?? '')}})
            await tx.tournamentTeam.update({where: {id: teams[1].id}, data: {name: String(b?.name ?? '')}})

            await tx.tournamentTeamMember.deleteMany({where: {teamId: {in: [teams[0].id, teams[1].id]}}})
            await tx.tournamentTeamMember.createMany({
                data: [
                    ...(a?.memberIds ?? []).map(pid => ({teamId: teams[0].id, participantId: String(pid)})),
                    ...(b?.memberIds ?? []).map(pid => ({teamId: teams[1].id, participantId: String(pid)})),
                ],
            })
        }
        return NextResponse.json({ok: true})
    })
}
