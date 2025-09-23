import type { Metadata } from 'next';
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Pojedynek',
        description: 'Szczegóły pojedynku',
        openGraph: { title: 'Pojedynek', type: 'website' },
        robots: { index: true, follow: true },
    };
}

export default function DuelLayout({ children }: { children: React.ReactNode }) {
    return children;
}
