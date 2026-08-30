import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {apiDelete, apiFetch, apiGet, apiPost} from './api-client'

const fetchMock = vi.fn()

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {'Content-Type': 'application/json'},
    })
}

beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('successful requests', () => {
    it('returns the parsed body', async () => {
        fetchMock.mockResolvedValue(jsonResponse({id: '1'}))
        await expect(apiGet('/api/x')).resolves.toEqual({id: '1'})
    })

    it('returns undefined for a 204', async () => {
        fetchMock.mockResolvedValue(new Response(null, {status: 204}))
        await expect(apiDelete('/api/x')).resolves.toBeUndefined()
    })

    it('sends GET requests without a content-type header', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}))
        await apiGet('/api/x')
        expect(fetchMock.mock.calls[0][1]).toMatchObject({cache: 'no-store'})
        expect(fetchMock.mock.calls[0][1].headers).toBeUndefined()
    })

    it('serialises the body and sets the content-type on writes', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}))
        await apiPost('/api/x', {a: 1})
        const [, init] = fetchMock.mock.calls[0]
        expect(init.method).toBe('POST')
        expect(init.body).toBe('{"a":1}')
        expect(init.headers).toMatchObject({'Content-Type': 'application/json'})
    })

    it('omits the body when none is given', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}))
        await apiPost('/api/x')
        expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    })
})

describe('error handling', () => {
    it('throws the server-provided message', async () => {
        fetchMock.mockResolvedValue(jsonResponse({message: 'Niewystarczające środki'}, 400))
        await expect(apiPost('/api/x', {})).rejects.toThrow('Niewystarczające środki')
    })

    it('falls back to the status code when the body has no message', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}, 500))
        await expect(apiGet('/api/x')).rejects.toThrow('(500)')
    })

    it('falls back when the error body is not JSON', async () => {
        fetchMock.mockResolvedValue(new Response('<html>502</html>', {status: 502}))
        await expect(apiGet('/api/x')).rejects.toThrow('(502)')
    })

    it('propagates a network failure', async () => {
        fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
        await expect(apiGet('/api/x')).rejects.toThrow('Failed to fetch')
    })
})

describe('caller overrides', () => {
    it('lets the caller override headers and cache', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}))
        await apiFetch('/api/x', {cache: 'force-cache', headers: {'X-Trace': 'abc'}})
        const [, init] = fetchMock.mock.calls[0]
        expect(init.cache).toBe('force-cache')
        expect(init.headers).toMatchObject({'X-Trace': 'abc'})
    })
})
