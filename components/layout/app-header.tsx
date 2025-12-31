
"use client"

import { Search, Menu } from "lucide-react"
import { NotificationsPopover } from "./notifications-popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Sidebar } from "./app-sidebar"
import { cn } from "@/lib/utils"

export function Header() {
    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center gap-4 border-b bg-background/80 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Menú</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72">
                    <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                    <SheetDescription className="sr-only">
                        Navegación lateral para acceder a las secciones del dashboard.
                    </SheetDescription>
                    <Sidebar className="border-none w-full" />
                </SheetContent>
            </Sheet>

            <div className="flex flex-1 items-center gap-4 md:gap-8">
                <form className="flex-1 md:flex-initial">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar transacciones..."
                            className="w-full bg-background pl-8 md:w-[300px] lg:w-[400px] rounded-full border-muted-foreground/20 focus-visible:ring-primary/20"
                        />
                    </div>
                </form>
            </div>

            <div className="flex items-center gap-2">
                <NotificationsPopover />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                            <Avatar className="h-9 w-9 border">
                                <AvatarImage src="/globe.svg" alt="@usuario" className="p-1 opacity-70" />
                                <AvatarFallback>US</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">Usuario</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    usuario@lumio.com
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            Configuración
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:bg-destructive/10">
                            Cerrar Sesión
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
