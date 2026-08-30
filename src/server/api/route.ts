import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'
import type {ZodType} from 'zod'
import {AppError, unauthorized} from '@/lib/errors'
import {isAdminRequest} from '@/lib/session'

type NextRouteContext = {params: unknown}

type HandlerArgs<TParams, TBody> = {
    req: NextRequest
    params: TParams
    body: TBody
}

type RouteOptions<TParams, TBody> = {
    admin?: boolean
    params?: ZodType<TParams>
    body?: ZodType<TBody>
    handler: (args: HandlerArgs<TParams, TBody>) => Promise<unknown>
}

async function resolveParams(ctx: NextRouteContext | undefined): Promise<unknown> {
    if (!ctx) return {}
    return ctx.params instanceof Promise ? await ctx.params : ctx.params
}

function issuesToMessage(error: unknown): string {
    const issues = (error as {issues?: Array<{path: PropertyKey[]; message: string}>})?.issues
    if (!issues?.length) return 'Nieprawidłowe dane wejściowe'
    return issues
        .map((issue) => (issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
        .join('; ')
}

function parseOrThrow<T>(schema: ZodType<T> | undefined, value: unknown): T {
    if (!schema) return value as T
    const result = schema.safeParse(value)
    if (!result.success) throw new AppError(issuesToMessage(result.error), 400)
    return result.data
}

async function readJsonBody(req: NextRequest): Promise<unknown> {
    try {
        return await req.json()
    } catch {
        throw new AppError('Oczekiwano treści żądania w formacie JSON', 400)
    }
}

export function defineRoute<TParams = Record<string, never>, TBody = undefined>(
    options: RouteOptions<TParams, TBody>,
) {
    return async (req: NextRequest, ctx?: NextRouteContext): Promise<NextResponse> => {
        try {
            if (options.admin && !(await isAdminRequest(req))) throw unauthorized()

            const params = parseOrThrow(options.params, await resolveParams(ctx))
            const body = options.body ? parseOrThrow(options.body, await readJsonBody(req)) : (undefined as TBody)

            const data = await options.handler({req, params, body})
            if (data instanceof NextResponse) return data
            return data === undefined
                ? new NextResponse(null, {status: 204})
                : NextResponse.json(data)
        } catch (e) {
            if (e instanceof AppError) {
                return NextResponse.json({message: e.message}, {status: e.status})
            }
            console.error(`Unhandled error in ${req.method} ${req.nextUrl.pathname}`, e)
            return NextResponse.json({message: 'Wystąpił nieoczekiwany błąd'}, {status: 500})
        }
    }
}
