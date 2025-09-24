import { NextResponse } from 'next/server'
import { getNextQuestion } from '@/server/db/services/quiz.service'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const kind = searchParams.get('kind')
    if (kind !== 'GROOM' && kind !== 'AUDIENCE') {
        return NextResponse.json({ message: 'Missing kind' }, { status: 400 })
    }
    const data = await getNextQuestion(kind)
    return NextResponse.json(data)
}
