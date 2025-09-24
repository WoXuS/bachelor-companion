import { NextResponse } from 'next/server'
import { undoLastAudience } from '@/server/db/services/quiz.service'
import {errMsg} from "@/lib/error";

export async function POST() {
    try {
        const r = await undoLastAudience()
        return NextResponse.json(r)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
