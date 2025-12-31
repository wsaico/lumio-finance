"use client"

import dynamic from 'next/dynamic'
import React from 'react'

// Move the dynamic import to a Client Component to comply with Next.js rules
const Header = dynamic(() => import("./app-header").then(mod => mod.Header), {
    ssr: false,
    loading: () => (
        <div className="sticky top-0 z-30 flex h-16 w-full items-center gap-4 border-b bg-background/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex flex-1 items-center gap-4 md:gap-8">
                <div className="h-9 w-[300px] lg:w-[400px] bg-muted animate-pulse rounded-full" />
            </div>
            <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-muted animate-pulse rounded-full" />
                <div className="h-9 w-9 bg-muted animate-pulse rounded-full" />
            </div>
        </div>
    )
})

export function SafeHeader() {
    return <Header />
}
