import type { Metadata } from 'next';
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Turnieje',
        description: 'Lista turniejów',
        openGraph: { title: 'Turnieje', type: 'website' },
        robots: { index: true, follow: true },
    };
}

export default function TournamentsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
