"use client"

import { useEffect, useState, useCallback } from "react"
import {
    Bell,
    Check,
    Info,
    AlertTriangle,
    Calendar,
    Loader2,
    RefreshCw,
    Trash2,
    ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type Notification = {
    id: string
    type: "INFO" | "SUCCESS" | "WARNING" | "REMINDER"
    title: string
    message: string
    data: any
    is_read: boolean
    created_at: string
}

const MODULE_LABELS: Record<string, string> = {
    subscriptions: "Suscripciones",
    transactions: "Movimientos",
    budgets: "Presupuestos",
    loans: "Préstamos",
    accounts: "Tarjetas",
    savings: "Metas",
}

const SYNC_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export function NotificationsPopover() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true)
        const { data } = await supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(30)

        if (data) {
            setNotifications(data as Notification[])
            setUnreadCount(data.filter((n: any) => !n.is_read).length)
        }
        setIsLoading(false)
    }, [supabase])

    const runSmartSync = useCallback(
        async (force = false) => {
            try {
                if (!force && typeof window !== "undefined") {
                    const last = Number(sessionStorage.getItem("lumio_notif_last_sync") || 0)
                    if (Date.now() - last < SYNC_COOLDOWN_MS) return
                }
                setIsSyncing(true)
                await fetch("/api/notifications/sync", { method: "POST" })
                if (typeof window !== "undefined") {
                    sessionStorage.setItem("lumio_notif_last_sync", String(Date.now()))
                }
                await fetchNotifications()
            } catch {
                // Silent fail on offline/network errors
            } finally {
                setIsSyncing(false)
            }
        },
        [fetchNotifications]
    )

    // Initial sync + fetch + realtime listener
    useEffect(() => {
        fetchNotifications()
        runSmartSync(false)

        const channel = supabase
            .channel("notifications-changes")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                },
                (payload: any) => {
                    const incoming = payload.new as Notification
                    setNotifications((prev) => {
                        if (prev.some((n) => n.id === incoming.id)) return prev
                        return [incoming, ...prev]
                    })
                    if (!incoming.is_read) {
                        setUnreadCount((prev) => prev + 1)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [fetchNotifications, runSmartSync, supabase])

    const markAsRead = async (id: string) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
        await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    }

    const markAllAsRead = async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
        await supabase.from("notifications").update({ is_read: true }).eq("is_read", false)
    }

    const clearRead = async () => {
        const readIds = notifications.filter((n) => n.is_read).map((n) => n.id)
        if (readIds.length === 0) return
        setNotifications((prev) => prev.filter((n) => !n.is_read))
        await supabase.from("notifications").delete().in("id", readIds)
    }

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id)
        }

        if (notification.data?.actionUrl) {
            router.push(notification.data.actionUrl)
            setIsOpen(false)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "SUCCESS":
                return <Check className="h-4 w-4 text-emerald-500" />
            case "WARNING":
                return <AlertTriangle className="h-4 w-4 text-amber-500" />
            case "REMINDER":
                return <Calendar className="h-4 w-4 text-primary" />
            default:
                return <Info className="h-4 w-4 text-muted-foreground" />
        }
    }

    const hasReadNotifications = notifications.some((n) => n.is_read)

    return (
        <Popover
            open={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open)
                if (open) fetchNotifications()
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-muted-foreground hover:text-foreground hover:bg-muted rounded-full h-10 w-10 transition-colors"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white border-2 border-background shadow-xs">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                    <span className="sr-only">Notificaciones</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[340px] sm:w-[380px] p-0 mr-4 rounded-3xl shadow-2xl border-border/80 bg-card/95 backdrop-blur-xl overflow-hidden"
                align="end"
                sideOffset={8}
            >
                <div className="border-b border-border/60 px-4 py-3.5 bg-muted/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-foreground">Notificaciones</h4>
                        {unreadCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                {unreadCount} nuevas
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                            onClick={() => runSmartSync(true)}
                            disabled={isSyncing}
                            title="Revisar alertas ahora"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                        </Button>
                        {unreadCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] font-bold text-muted-foreground hover:text-primary rounded-lg"
                                onClick={markAllAsRead}
                            >
                                Leer todo
                            </Button>
                        )}
                        {hasReadNotifications && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-rose-500"
                                onClick={clearRead}
                                title="Limpiar leídas"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>

                <ScrollArea className="h-[380px]">
                    {isLoading && notifications.length === 0 ? (
                        <div className="flex justify-center p-10 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-10 text-center text-muted-foreground gap-2">
                            <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                                <Bell className="h-5 w-5 opacity-40" />
                            </div>
                            <p className="text-sm font-bold text-foreground">Todo al día</p>
                            <p className="text-xs text-muted-foreground max-w-[230px]">
                                Te avisaremos sobre suscripciones, presupuestos, préstamos, tarjetas y metas.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-border/50">
                            {notifications.map((notification) => {
                                const moduleKey = notification.data?.module as string | undefined
                                const moduleLabel = moduleKey ? MODULE_LABELS[moduleKey] : null

                                return (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "flex items-start gap-3 p-3.5 text-left transition-colors group w-full",
                                            notification.is_read
                                                ? "bg-transparent hover:bg-muted/40"
                                                : "bg-primary/[0.04] hover:bg-primary/[0.08]"
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "mt-0.5 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 border",
                                                notification.is_read
                                                    ? "bg-muted/40 border-border/60"
                                                    : "bg-card border-primary/30 shadow-xs"
                                            )}
                                        >
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p
                                                    className={cn(
                                                        "text-xs leading-snug truncate",
                                                        notification.is_read
                                                            ? "font-semibold text-foreground/80"
                                                            : "font-bold text-foreground"
                                                    )}
                                                >
                                                    {notification.title}
                                                </p>
                                                {!notification.is_read && (
                                                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                                {notification.message}
                                            </p>
                                            <div className="flex items-center gap-2 pt-0.5">
                                                {moduleLabel && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                                        {moduleLabel}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground/70">
                                                    {formatDistanceToNow(new Date(notification.created_at), {
                                                        addSuffix: true,
                                                        locale: es,
                                                    })}
                                                </span>
                                                {notification.data?.actionUrl && (
                                                    <ChevronRight className="h-3 w-3 text-muted-foreground/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
