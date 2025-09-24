export const errMsg = (e: unknown) =>
    e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unknown error'
