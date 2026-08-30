import {NextRequest} from 'next/server'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {z} from 'zod'
import {AppError, notFound} from '@/lib/errors'
import {defineRoute} from './route'

const isAdminRequest = vi.hoisted(() => vi.fn())
vi.mock('@/lib/session', () => ({isAdminRequest}))

function request(body?: unknown, method = 'POST') {
    return new NextRequest('http://localhost/api/test', {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
    })
}

beforeEach(() => {
    isAdminRequest.mockReset()
    isAdminRequest.mockResolvedValue(true)
    vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('authorisation', () => {
    it('rejects a non-admin with 401 and never runs the handler', async () => {
        isAdminRequest.mockResolvedValue(false)
        const handler = vi.fn()
        const route = defineRoute({admin: true, handler})

        const res = await route(request())

        expect(res.status).toBe(401)
        expect(await res.json()).toEqual({message: 'Unauthorized'})
        expect(handler).not.toHaveBeenCalled()
    })

    it('lets an admin through', async () => {
        const route = defineRoute({admin: true, handler: async () => ({ok: true})})
        expect((await route(request())).status).toBe(200)
    })

    it('does not check auth on public routes', async () => {
        const route = defineRoute({handler: async () => ({ok: true})})
        await route(request())
        expect(isAdminRequest).not.toHaveBeenCalled()
    })
})

describe('body validation', () => {
    const route = defineRoute({
        body: z.object({amount: z.number().int().positive()}),
        handler: async ({body}) => ({doubled: body.amount * 2}),
    })

    it('passes parsed data to the handler', async () => {
        const res = await route(request({amount: 21}))
        expect(await res.json()).toEqual({doubled: 42})
    })

    it('rejects an invalid body with 400 and names the field', async () => {
        const res = await route(request({amount: -1}))
        expect(res.status).toBe(400)
        expect((await res.json()).message).toContain('amount')
    })

    it('rejects a missing body', async () => {
        expect((await route(request())).status).toBe(400)
    })

    it('rejects a malformed JSON body', async () => {
        const res = await route(
            new NextRequest('http://localhost/api/test', {method: 'POST', body: 'not json'}),
        )
        expect(res.status).toBe(400)
    })

    it('strips fields the schema does not declare', async () => {
        const echo = defineRoute({
            body: z.object({keep: z.string()}),
            handler: async ({body}) => body,
        })
        expect(await (await echo(request({keep: 'yes', drop: 'no'}))).json()).toEqual({keep: 'yes'})
    })
})

describe('params', () => {
    it('awaits a promised params object', async () => {
        const route = defineRoute({
            params: z.object({id: z.string().min(1)}),
            handler: async ({params}) => ({id: params.id}),
        })
        const res = await route(request(undefined, 'GET'), {params: Promise.resolve({id: 'abc'})})
        expect(await res.json()).toEqual({id: 'abc'})
    })

    it('rejects params that fail validation', async () => {
        const route = defineRoute({
            params: z.object({id: z.string().min(1)}),
            handler: async () => ({ok: true}),
        })
        const res = await route(request(undefined, 'GET'), {params: {id: ''}})
        expect(res.status).toBe(400)
    })
})

describe('error mapping', () => {
    it('maps an AppError to its own status', async () => {
        const route = defineRoute({handler: async () => { throw notFound('Nie znaleziono') }})
        const res = await route(request())
        expect(res.status).toBe(404)
        expect(await res.json()).toEqual({message: 'Nie znaleziono'})
    })

    it('honours a custom AppError status', async () => {
        const route = defineRoute({handler: async () => { throw new AppError('conflict', 409) }})
        expect((await route(request())).status).toBe(409)
    })

    it('hides unexpected error details behind a 500', async () => {
        const route = defineRoute({
            handler: async () => { throw new Error('connect ECONNREFUSED 10.0.0.1:5432') },
        })
        const res = await route(request())
        expect(res.status).toBe(500)
        expect(await res.json()).toEqual({message: 'Wystąpił nieoczekiwany błąd'})
    })
})

describe('responses', () => {
    it('returns 204 when the handler returns nothing', async () => {
        const route = defineRoute({handler: async () => undefined})
        expect((await route(request())).status).toBe(204)
    })

    it('passes a handler-built response through untouched', async () => {
        const route = defineRoute({
            handler: async () => {
                const {NextResponse} = await import('next/server')
                const res = NextResponse.json({custom: true})
                res.cookies.set('flag', '1')
                return res
            },
        })
        const res = await route(request())
        expect(res.cookies.get('flag')?.value).toBe('1')
    })
})
