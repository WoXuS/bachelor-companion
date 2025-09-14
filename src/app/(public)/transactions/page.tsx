import TransactionsClient from './ui/TransactionsClient'

export default function TransactionsPage({
                                             participantId,
                                             order,
                                         }: {
    participantId?: string
    order?: 'asc' | 'desc'
}) {
    return <TransactionsClient participantId={participantId} initialOrder={order}/>
}
