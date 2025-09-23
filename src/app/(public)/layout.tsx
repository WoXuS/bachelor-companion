import type { Metadata } from 'next';
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: 'Cennik',
        description: 'Cennik oraz jak grać',
        openGraph: { title: 'Cennik', type: 'website' },
        robots: { index: true, follow: true },
    };
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return children;
}
