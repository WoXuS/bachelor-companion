export const ADMIN_COOKIE = 'sb_admin'

const SESSION_TTL_SECONDS = 60 * 60 * 12
const encoder = new TextEncoder()

export const adminCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
}

function encodeBase64Url(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeBase64Url(value: string): ArrayBuffer {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
}

let signingKey: Promise<CryptoKey> | null = null

function getSigningKey(): Promise<CryptoKey> {
    if (!signingKey) {
        const secret = process.env.SESSION_SECRET
        if (!secret || secret.length < 32) {
            return Promise.reject(new Error('SESSION_SECRET must be set to at least 32 characters'))
        }
        signingKey = crypto.subtle.importKey(
            'raw',
            encoder.encode(secret),
            {name: 'HMAC', hash: 'SHA-256'},
            false,
            ['sign', 'verify'],
        )
    }
    return signingKey
}

export async function createAdminToken(issuedAtMs: number = Date.now()): Promise<string> {
    const payload = encodeBase64Url(
        encoder.encode(JSON.stringify({exp: Math.floor(issuedAtMs / 1000) + SESSION_TTL_SECONDS})),
    )
    const signature = await crypto.subtle.sign('HMAC', await getSigningKey(), encoder.encode(payload))
    return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`
}

export async function verifyAdminToken(
    token: string | undefined,
    nowMs: number = Date.now(),
): Promise<boolean> {
    if (!token) return false
    const [payload, signature] = token.split('.')
    if (!payload || !signature) return false

    try {
        const valid = await crypto.subtle.verify(
            'HMAC',
            await getSigningKey(),
            decodeBase64Url(signature),
            encoder.encode(payload),
        )
        if (!valid) return false

        const claims: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)))
        const exp = (claims as {exp?: unknown})?.exp
        return typeof exp === 'number' && exp > Math.floor(nowMs / 1000)
    } catch {
        return false
    }
}

export async function verifyAdminPassword(candidate: unknown): Promise<boolean> {
    const expected = process.env.ADMIN_PASSWORD
    if (!expected || typeof candidate !== 'string') return false

    const [a, b] = await Promise.all([
        crypto.subtle.digest('SHA-256', encoder.encode(candidate)),
        crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    ])
    const left = new Uint8Array(a)
    const right = new Uint8Array(b)
    let diff = 0
    for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i]
    return diff === 0
}
