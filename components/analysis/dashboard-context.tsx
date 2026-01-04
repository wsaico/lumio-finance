'use client';

import React, { createContext, useContext } from 'react';
import { DashboardData } from './types';

const DashboardContext = createContext<DashboardData | null>(null);

export function DashboardProvider({
    data,
    children
}: {
    data: DashboardData,
    children: React.ReactNode
}) {
    return (
        <DashboardContext.Provider value={data}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return { data: context };
}
