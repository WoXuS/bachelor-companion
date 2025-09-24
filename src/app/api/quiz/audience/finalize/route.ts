import { NextResponse } from 'next/server'
import { finalizeAudienceBonus } from '@/server/db/services/quiz.service'
import {errMsg} from "@/lib/error";

export async function POST() {
    try {
        const res = await finalizeAudienceBonus()
        return NextResponse.json(res)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
