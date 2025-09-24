import { NextResponse } from 'next/server'
import { undoLastGroom } from '@/server/db/services/quiz.service'
import {errMsg} from "@/lib/error";

export async function POST() {
    try {
        const r = await undoLastGroom()
        return NextResponse.json(r)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
