import { NextResponse } from 'next/server'
import { getGroomStats } from '@/server/db/services/quiz.service'
import {errMsg} from "@/lib/error";

export async function GET() {
    try {
        const stats = await getGroomStats()
        return NextResponse.json(stats)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 500 })
    }
}
