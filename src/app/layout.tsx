import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import './globals.css'
import {QueryProvider} from '@/providers/query'
import React from "react";
import {Toaster} from "sonner";
import {NavigationBar} from "@/components/ui/NavigationBar";

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
})

export const metadata: Metadata = {
    title: 'Companion App',
    description: 'Aplikacja na kawalerski',
}

export default function RootLayout({children,}: { children: React.ReactNode }) {

    return (
        <html lang="pl">
        <body
            className={`${inter.variable} antialiased bg-[#1f1f1f] dark`}
        >
        <QueryProvider>
            {children}
            <NavigationBar/>
        </QueryProvider>

        <Toaster/>
        </body>
        </html>
    )
}
