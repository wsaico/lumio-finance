'use client';

import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DashboardHeader() {
    return (
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
            <div className="flex flex-1 items-center gap-4">
                <h1 className="text-lg font-semibold md:text-xl">Lumio Finance X</h1>
            </div>
            <div className="flex items-center gap-4">
                <form className="hidden lg:block relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar..."
                        className="w-64 pl-8 bg-muted/50 border-none"
                    />
                </form>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Bell className="h-5 w-5" />
                    <span className="sr-only">Notificaciones</span>
                </Button>
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600" />
            </div>
        </header>
    );
}
