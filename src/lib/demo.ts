export const DEMO_RESET_NOTE = 'co godzinę'

export function isDemoMode(): boolean {
    return process.env.DEMO_MODE === 'true'
}
