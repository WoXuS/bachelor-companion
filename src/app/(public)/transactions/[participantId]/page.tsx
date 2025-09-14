import TransactionsPage from '../page'

export default function ParticipantTransactions({
                                                    params,
                                                    searchParams,
                                                }: {
    params: { participantId: string }
    searchParams: { order?: 'asc' | 'desc' }
}) {
    return (
        <TransactionsPage
            participantId={params.participantId}
            order={searchParams.order}
        />
    )
}
