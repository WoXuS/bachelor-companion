import VirtualEggButton from "@/components/easter-egg/VirtualEggButton";
import React from "react";

export default function HowToEarnPage() {
    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 pt-20">
            <h1 className="text-2xl font-bold mb-4">Jak zdobywać $pruch Dollary?</h1>
            <ul className="space-y-3">
                <li className="flex gap-2 text-sm justify-between items-center rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-3 shadow-sm">
                    <p>Udział w turniejach</p>
                    <div className="flex flex-col gap-1 text-slate-400 border-l-2 border-primary pl-3">
                        <p className="whitespace-nowrap"><span className="text-primary">40-60 <span
                            className="text-xs">$pruch</span></span> <span
                            className="text-xs">za mecz</span></p>
                        <p className="whitespace-nowrap"><span className="text-primary">200-220 <span
                            className="text-xs">$pruch</span></span> <span
                            className="text-xs">za finał</span></p>
                    </div>
                </li>
                <li className="flex gap-2 text-sm justify-between items-center rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-3 shadow-sm">
                    <p>Udział w pojedynkach</p>
                    <p className="text-xs text-slate-400 border-l-2 border-primary pl-3">
                        między graczami
                    </p>
                </li>
                <li className="flex gap-2 text-sm justify-between items-center rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-3 shadow-sm">
                    <p className="text-transparent animate-gradient">Hazard</p>
                    <p className="text-xs text-slate-400 border-l-2 border-primary pl-3">
                        między graczami
                    </p>
                </li>
                <li className="flex gap-2 text-sm justify-between items-center rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-3 shadow-sm">
                    <p>Pochowane żetony fizyczne</p>
                    <p className="whitespace-nowrap text-slate-400 border-l-2 border-primary pl-3">
                        <span className="text-primary">
                            50 <span className="text-xs">$pruch</span>
                        </span>
                    </p>
                </li>
                <li className="flex gap-2 text-sm justify-between items-center rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-3 shadow-sm">
                    <p>Pochowane żetony na stronie</p>
                    <p className="whitespace-nowrap text-slate-400 border-l-2 border-primary pl-3">
                        <span className="text-primary">
                            50 <span className="text-xs">$pruch</span>
                        </span>
                    </p>
                </li>
                <li className="flex gap-2 text-sm justify-between items-center rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-3 shadow-sm">
                    <p>Dla Antoniego - pytania o znajomość Niny</p>
                    <p className="whitespace-nowrap text-slate-400 border-l-2 border-primary pl-3"><span className="text-primary">20 <span
                        className="text-xs">$pruch</span></span></p>
                </li>
                <li className="flex gap-2 text-sm justify-between items-center rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-3 shadow-sm">
                    <p>Dla reszty - pytania o znajomość Antoniego</p>
                    <div className="flex flex-col gap-1 text-sm text-slate-400 border-l-2 border-primary pl-3">
                        <p className="whitespace-nowrap"><span className="text-primary">40 <span
                            className="text-xs">$pruch</span></span> <span
                            className="text-xs">za pytanie</span></p>
                        <p><span className="text-primary">50 <span className="text-xs">$pruch</span></span> <span
                            className="text-xs">za najwięcej poprawnych</span></p>
                    </div>
                </li>
                <li className="flex gap-2 text-sm justify-between items-center rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900/60 to-slate-900/30 p-3 shadow-sm">
                    <p>Złowić rybę (jedna na osobę)</p>
                    <p className="whitespace-nowratext-slate-400 border-l-2 border-primary pl-3"><span className="text-primary">200 <span
                        className="text-xs">$pruch</span></span></p>
                </li>
            </ul>
            <VirtualEggButton placementKey="how-to-earn" className="mt-500"/>

        </div>
    )
}