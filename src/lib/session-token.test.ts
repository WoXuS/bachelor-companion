import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const SECRET = 'a'.repeat(48)
const OTHER_SECRET = 'b'.repeat(48)

async function loadSession(env: {secret?: string; adminPassword?: string} = {}) {
    const {secret = SECRET, adminPassword = 'correct-horse'} = env
    if ('secret' in env && env.secret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = secret
    if ('adminPassword' in env && env.adminPassword === undefined) delete process.env.ADMIN_PASSWORD
    else process.env.ADMIN_PASSWORD = adminPassword
    vi.resetModules()
    return import('./session-token')
}

const originalEnv = {...process.env}

beforeEach(() => {
    process.env = {...originalEnv}
})

afterEach(() => {
    process.env = {...originalEnv}
})

describe('admin token', () => {
    it('accepts a token it just issued', async () => {
        const {createAdminToken, verifyAdminToken} = await loadSession()
        expect(await verifyAdminToken(await createAdminToken())).toBe(true)
    })

    it('rejects the forged literal cookie the old scheme accepted', async () => {
        const {verifyAdminToken} = await loadSession()
        expect(await verifyAdminToken('1')).toBe(false)
    })

    it('rejects a missing or malformed token', async () => {
        const {verifyAdminToken} = await loadSession()
        expect(await verifyAdminToken(undefined)).toBe(false)
        expect(await verifyAdminToken('')).toBe(false)
        expect(await verifyAdminToken('no-dot')).toBe(false)
        expect(await verifyAdminToken('a.b.c')).toBe(false)
    })

    it('rejects a token whose payload was tampered with', async () => {
        const {createAdminToken, verifyAdminToken} = await loadSession()
        const [, signature] = (await createAdminToken()).split('.')
        const forgedPayload = Buffer.from(JSON.stringify({exp: 9999999999}))
            .toString('base64url')
        expect(await verifyAdminToken(`${forgedPayload}.${signature}`)).toBe(false)
    })

    it('rejects a token signed with a different secret', async () => {
        const {createAdminToken} = await loadSession({secret: SECRET})
        const token = await createAdminToken()
        const {verifyAdminToken} = await loadSession({secret: OTHER_SECRET})
        expect(await verifyAdminToken(token)).toBe(false)
    })

    it('rejects an expired token', async () => {
        const {createAdminToken, verifyAdminToken} = await loadSession()
        const issuedAt = Date.now()
        const thirteenHoursLater = issuedAt + 13 * 60 * 60 * 1000
        const token = await createAdminToken(issuedAt)
        expect(await verifyAdminToken(token, issuedAt)).toBe(true)
        expect(await verifyAdminToken(token, thirteenHoursLater)).toBe(false)
    })

    it('fails closed when no secret is configured', async () => {
        const {createAdminToken, verifyAdminToken} = await loadSession({secret: undefined})
        expect(await verifyAdminToken('anything')).toBe(false)
        await expect(createAdminToken()).rejects.toThrow(/SESSION_SECRET/)
    })

    it('fails closed when the secret is too short to be safe', async () => {
        const {verifyAdminToken} = await loadSession({secret: 'short'})
        expect(await verifyAdminToken('anything')).toBe(false)
    })
})

describe('verifyAdminPassword', () => {
    it('accepts the configured password', async () => {
        const {verifyAdminPassword} = await loadSession({adminPassword: 'correct-horse'})
        expect(await verifyAdminPassword('correct-horse')).toBe(true)
    })

    it('rejects a wrong password', async () => {
        const {verifyAdminPassword} = await loadSession({adminPassword: 'correct-horse'})
        expect(await verifyAdminPassword('wrong')).toBe(false)
        expect(await verifyAdminPassword('correct-horse ')).toBe(false)
    })

    it('rejects non-string candidates', async () => {
        const {verifyAdminPassword} = await loadSession({adminPassword: 'correct-horse'})
        expect(await verifyAdminPassword(undefined)).toBe(false)
        expect(await verifyAdminPassword(null)).toBe(false)
        expect(await verifyAdminPassword({})).toBe(false)
    })

    it('rejects everything when no password is configured', async () => {
        const {verifyAdminPassword} = await loadSession({adminPassword: ''})
        expect(await verifyAdminPassword('')).toBe(false)
        expect(await verifyAdminPassword('anything')).toBe(false)
    })
})
