export async function getAdmin() {
    const res = await fetch('/api/auth/me', { cache: 'no-store' })
    if (!res.ok) return { isAdmin: false }
    return await res.json() as Promise<{ isAdmin: boolean }>
}
