async function extractMessage(res: Response): Promise<string> {
    try {
        const data = await res.json()
        if (data && typeof data.message === 'string') return data.message
    } catch {
        // response body was empty or not JSON
    }
    return `Żądanie nie powiodło się (${res.status})`
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
        cache: 'no-store',
        ...init,
        headers:
            init?.body === undefined
                ? init?.headers
                : {'Content-Type': 'application/json', ...init?.headers},
    })

    if (!res.ok) throw new Error(await extractMessage(res))
    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
}

const withBody = (method: string) =>
    <T,>(path: string, body?: unknown): Promise<T> =>
        apiFetch<T>(path, {
            method,
            body: body === undefined ? undefined : JSON.stringify(body),
        })

export const apiGet = <T,>(path: string): Promise<T> => apiFetch<T>(path)
export const apiPost = withBody('POST')
export const apiPut = withBody('PUT')
export const apiPatch = withBody('PATCH')
export const apiDelete = withBody('DELETE')
