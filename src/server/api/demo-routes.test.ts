import {NextRequest} from 'next/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const resetDemoData = vi.hoisted(() => vi.fn())
vi.mock('@/server/db/seed/demo', () => ({resetDemoData}))

const originalEnv = {...process.env}

function request(headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost/api/demo/reset', {method: 'POST', headers})
}

beforeEach(() => {
    process.env = {...originalEnv}
    process.env.SESSION_SECRET = 'x'.repeat(48)
    resetDemoData.mockReset()
    resetDemoData.mockResolvedValue({participants: 12})
    vi.resetModules()
})

afterEach(() => {
    process.env = {...originalEnv}
})

describe('demo reset endpoint', () => {
    it('does not exist when demo mode is off', async () => {
        delete process.env.DEMO_MODE
        process.env.CRON_SECRET = 'secret'
        const {POST} = await import('@/app/api/demo/reset/route')

        const res = await POST(request({authorization: 'Bearer secret'}))

        expect(res.status).toBe(404)
        expect(resetDemoData).not.toHaveBeenCalled()
    })

    it('treats any value other than "true" as off', async () => {
        process.env.DEMO_MODE = '1'
        process.env.CRON_SECRET = 'secret'
        const {POST} = await import('@/app/api/demo/reset/route')

        expect((await POST(request({authorization: 'Bearer secret'}))).status).toBe(404)
    })

    it('refuses to run when no cron secret is configured', async () => {
        process.env.DEMO_MODE = 'true'
        delete process.env.CRON_SECRET
        const {POST} = await import('@/app/api/demo/reset/route')

        expect((await POST(request())).status).toBe(401)
        expect(resetDemoData).not.toHaveBeenCalled()
    })

    it('rejects a missing or wrong bearer token', async () => {
        process.env.DEMO_MODE = 'true'
        process.env.CRON_SECRET = 'secret'
        const {POST} = await import('@/app/api/demo/reset/route')

        expect((await POST(request())).status).toBe(401)
        expect((await POST(request({authorization: 'Bearer wrong'}))).status).toBe(401)
        expect((await POST(request({authorization: 'secret'}))).status).toBe(401)
        expect(resetDemoData).not.toHaveBeenCalled()
    })

    it('resets when demo mode is on and the token matches', async () => {
        process.env.DEMO_MODE = 'true'
        process.env.CRON_SECRET = 'secret'
        const {POST} = await import('@/app/api/demo/reset/route')

        const res = await POST(request({authorization: 'Bearer secret'}))

        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({participants: 12})
        expect(resetDemoData).toHaveBeenCalledOnce()
    })
})

describe('demo login endpoint', () => {
    it('does not exist when demo mode is off', async () => {
        delete process.env.DEMO_MODE
        const {POST} = await import('@/app/api/auth/demo-login/route')

        const res = await POST(new NextRequest('http://localhost/api/auth/demo-login', {method: 'POST'}))

        expect(res.status).toBe(404)
        expect(res.cookies.get('sb_admin')).toBeUndefined()
    })

    it('hands out a real admin session when demo mode is on', async () => {
        process.env.DEMO_MODE = 'true'
        const [{POST}, {verifyAdminToken}] = await Promise.all([
            import('@/app/api/auth/demo-login/route'),
            import('@/lib/session-token'),
        ])

        const res = await POST(new NextRequest('http://localhost/api/auth/demo-login', {method: 'POST'}))
        const token = res.cookies.get('sb_admin')?.value

        expect(res.status).toBe(200)
        expect(await verifyAdminToken(token)).toBe(true)
    })

    it('marks the session cookie http-only', async () => {
        process.env.DEMO_MODE = 'true'
        const {POST} = await import('@/app/api/auth/demo-login/route')

        const res = await POST(new NextRequest('http://localhost/api/auth/demo-login', {method: 'POST'}))

        expect(res.cookies.get('sb_admin')?.httpOnly).toBe(true)
    })
})
