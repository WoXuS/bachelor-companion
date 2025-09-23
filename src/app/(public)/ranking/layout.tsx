import type { Metadata } from 'next';
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Ranking',
        description: 'Live leaderboard',
        openGraph: { title: 'Ranking', type: 'website' },
        robots: { index: true, follow: true },
    };
}

export default function RankingLayout({ children }: { children: React.ReactNode }) {
    return children;
}
