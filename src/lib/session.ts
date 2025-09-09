import { cookies } from 'next/headers'
const COOKIE = 'sb_admin'
export const setAdmin = () =>
    cookies().set(COOKIE, '1', { httpOnly: true, sameSite: 'lax', secure: true, path: '/' })
export const clearAdmin = () =>
    cookies().set(COOKIE, '', { httpOnly: true, expires: new Date(0), path: '/' })
export const isAdmin = () => cookies().get(COOKIE)?.value === '1'
