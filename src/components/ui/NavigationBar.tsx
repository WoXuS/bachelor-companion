'use client'

import Link from "next/link";
import {NotepadText, Award, ArrowRightLeft, BanknoteArrowUp, ChevronDown} from "lucide-react";
import {Ranking} from "@/components/icons/Ranking"
import {Tournament} from "@/components/icons/Tournament";
import React, {ReactNode, useState} from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import {useQuery} from "@tanstack/react-query";
import {getAdmin} from "@/hooks/useAdmin";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";

export function NavigationBar() {
    const {data} = useQuery({queryKey: ['me'], queryFn: getAdmin})
    const isAdmin = !!data?.isAdmin

    const links = [
        {href: '/', icon: <NotepadText size="32"/>, label: 'Cennik'},
        {href: '/ranking', icon: <Ranking size="32"/>, label: 'Ranking'},
        {href: '/transactions', icon: <ArrowRightLeft size="32"/>, label: 'Historia punktów'},
        {href: '/tournaments', icon: <Tournament size="32"/>, label: 'Turnieje'},
        {href: '/rewards', icon: <Award size="32"/>, label: 'Nagrody'},
        {href: '/how-to-earn', icon: <BanknoteArrowUp size="32"/>, label: 'Jak zarabiać dollary'},
    ]

    return (
        <div className="relative">
            <nav
                className="fixed top-0 w-full flex bg-primary/80 shadow-primary-foreground shadow-[0_3px_15px_5px]">
                {links.map((l, index, row) => (
                    <Link key={l.href} href={l.href}
                          className={`py-3 px-3 text-muted ${index + 1 !== row.length && 'border-r-2 border-muted/50'} flex-1 flex justify-center`}>{l.icon}</Link>
                ))}
                {isAdmin &&
                    <LogoutButton/>
                }
            </nav>
            <NavigationBarDialog links={links}/>
        </div>
    )
}

type Link = {
    href: string,
    icon: ReactNode,
    label: string
}

function NavigationBarDialog({links}: { links: Link[] }) {
    const [open, setOpen] = useState<boolean>(false)
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="link" className="fixed right-4 rounded-none rounded-b-sm top-[56px] bg-primary/80 text-muted py-[0_!important] px-[3px_!important] h-auto"><ChevronDown size="20"/></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Menu</DialogTitle></DialogHeader>
                <nav className="grid sm:grid-cols-2 gap-3">
                    {links.map((l) => (
                        <Button asChild key={l.href} className="justify-start" onClick={() => setOpen(false)}>
                            <Link href={l.href}>
                                {l.icon}
                                {l.label}
                            </Link>
                        </Button>
                    ))}
                </nav>
            </DialogContent>
        </Dialog>
    )
}