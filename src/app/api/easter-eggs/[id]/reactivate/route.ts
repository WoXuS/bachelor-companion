import { NextResponse } from 'next/server'
import { reactivateEgg } from '@/server/db/services/easter-eggs.service'
import { isAdminServer } from '@/lib/session'
import {errMsg} from "@/lib/error";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
    try {
        if (!isAdminServer()) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const res = await reactivateEgg(params.id)
        return NextResponse.json(res)
    } catch (e) {
        return NextResponse.json({ message: errMsg(e) }, { status: 400 })
    }
}
