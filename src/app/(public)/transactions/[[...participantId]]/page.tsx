import TransactionsClient from "@/components/transactions/TransactionsClient";
export const dynamicParams = true
export default function Page({
                                 params,
                                 searchParams,
                             }: {
    params: { participantId?: string }
    searchParams?: { order?: 'asc' | 'desc' }
}) {
    const participantId =
        Array.isArray(params.participantId) ? params.participantId[0] : undefined
    return (
        <TransactionsClient
            participantId={participantId}
            initialOrder={searchParams?.order}
        />
    )
}
