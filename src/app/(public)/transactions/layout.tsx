import type { Metadata } from 'next';
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Transakcje',
        description: 'Historia transakcji',
        openGraph: { title: 'Transakcje', type: 'website' },
        robots: { index: true, follow: true },
    };
}

export default function TrasactionsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
