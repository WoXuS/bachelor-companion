'use client'

import {useQuery} from '@tanstack/react-query'
import {apiGet} from '@/lib/api-client'
import {queryKeys} from '@/hooks/queries'

type DemoStatus = {demo: boolean; resetNote: string}

export function DemoBanner() {
    const {data} = useQuery({
        queryKey: queryKeys.demoStatus,
        queryFn: () => apiGet<DemoStatus>('/api/demo/status'),
        staleTime: Infinity,
    })

    if (!data?.demo) return null

    return (
        <>
            <div className="h-12" aria-hidden/>
            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-200 backdrop-blur">
                Instancja demonstracyjna — wszystkie dane są fikcyjne i resetowane {data.resetNote}.
                Panel admina jest otwarty, możesz bez obaw wszystko poprzestawiać.
            </div>
        </>
    )
}
