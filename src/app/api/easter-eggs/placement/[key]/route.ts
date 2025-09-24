import { NextResponse } from 'next/server'
import { getEggByPlacement } from '@/server/db/services/easter-eggs.service'
import {errMsg} from "@/lib/error";

export async function GET(_req: Request, { params }: { params: { key: string } }) {
    try {
        const egg = await getEggByPlacement(params.key)
        return NextResponse.json(egg ?? null)
    } catch (e: unknown) {
        return NextResponse.json({ message: errMsg(e) }, { status: 500 })
    }
}
