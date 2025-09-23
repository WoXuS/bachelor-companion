import type { Metadata } from 'next';
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Jak zdobywać $pruch dollary',
        openGraph: { title: 'Jak zdobywać $pruch dollary', type: 'website' },
        robots: { index: true, follow: true },
    };
}

export default function HowToEarnLayout({ children }: { children: React.ReactNode }) {
    return children;
}
