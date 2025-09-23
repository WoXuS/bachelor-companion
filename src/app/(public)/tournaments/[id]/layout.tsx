import type { Metadata } from 'next';
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Turniej',
        description: 'Szczegóły turnieju',
        openGraph: { title: 'Turniej', type: 'website' },
        robots: { index: true, follow: true },
    };
}

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
    return children;
}
