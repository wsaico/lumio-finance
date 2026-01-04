'use client';

import { DashboardHeader } from './dashboard/header';

export function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col">
            <DashboardHeader />
            <main className="flex-1 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                {children}
            </main>
        </div>
    );
}
