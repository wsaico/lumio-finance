"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
    const { theme, resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const toggleTheme = () => {
        const current = resolvedTheme || theme || "light"
        setTheme(current === "dark" ? "light" : "dark")
    }

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-muted-foreground">
                <Sun className="h-5 w-5 opacity-50" />
            </Button>
        )
    }

    const isDark = (resolvedTheme || theme) === "dark"

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full h-10 w-10 text-muted-foreground hover:text-foreground transition-colors"
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label="Cambiar tema"
        >
            {isDark ? (
                <Moon className="h-5 w-5 text-primary transition-transform duration-200" />
            ) : (
                <Sun className="h-5 w-5 text-primary transition-transform duration-200" />
            )}
        </Button>
    )
}

