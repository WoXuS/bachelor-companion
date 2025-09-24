import type { Metadata } from 'next';
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Historia punktów',
        description: 'Historia wszystkich transakcji',
        openGraph: { title: 'Historia punktów', type: 'website' },
        robots: { index: true, follow: true },
    };
}

export default function DuelLayout({ children }: { children: React.ReactNode }) {
    return children;
}
