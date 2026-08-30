export class AppError extends Error {
    constructor(
        message: string,
        readonly status: number = 400,
    ) {
        super(message)
        this.name = 'AppError'
    }
}

export const badRequest = (message: string) => new AppError(message, 400)
export const unauthorized = (message = 'Unauthorized') => new AppError(message, 401)
export const notFound = (message: string) => new AppError(message, 404)
export const conflict = (message: string) => new AppError(message, 409)

export const errMsg = (e: unknown) =>
    e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error'
