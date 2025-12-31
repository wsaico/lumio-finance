"use client"

import { useEffect, useState } from "react"
import { Bell, Check, Info, AlertTriangle, Calendar, Loader2 } from "lucide-react"
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

type Notification = {
    id: string
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'REMINDER'
    title: string
    message: string
    data: any
    is_read: boolean
    created_at: string
}

export function NotificationsPopover() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    const fetchNotifications = async () => {
        setIsLoading(true)
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        if (data) {
            setNotifications(data as Notification[])
            setUnreadCount(data.filter((n: any) => !n.is_read).length)
        }
        setIsLoading(false)
    }

    // Initial fetch
    useEffect(() => {
        fetchNotifications()

        // Subscribe to new notifications
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    setNotifications(prev => [payload.new as Notification, ...prev])
                    setUnreadCount(prev => prev + 1)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))

        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    }

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    }

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id)
        }

        if (notification.type === 'REMINDER' && notification.data?.actionUrl) {
            router.push(notification.data.actionUrl)
            setIsOpen(false)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'SUCCESS': return <Check className="h-4 w-4 text-emerald-500" />
            case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500" />
            case 'REMINDER': return <Calendar className="h-4 w-4 text-blue-500" />
            default: return <Info className="h-4 w-4 text-slate-500" />
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={(open) => {
            setIsOpen(open)
            if (open) fetchNotifications()
        }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-background animate-pulse" />
                    )}
                    <span className="sr-only">Notificaciones</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4 shadow-xl border-slate-200 dark:border-zinc-800" align="end">
                <div className="border-b p-4 flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Notificaciones</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-primary"
                            onClick={markAllAsRead}
                        >
                            Marcar todo leído
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[400px]">
                    {isLoading && notifications.length === 0 ? (
                        <div className="flex justify-center p-8 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2">
                            <Bell className="h-8 w-8 opacity-20" />
                            <p className="text-sm">No tienes notificaciones</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`
                                        flex items-start gap-4 p-4 text-left border-b last:border-0 transition-colors
                                        ${notification.is_read ? 'bg-background hover:bg-slate-50 dark:hover:bg-zinc-900/50' : 'bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20'}
                                    `}
                                >
                                    <div className={`
                                        mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 border
                                        ${notification.is_read ? 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800' : 'bg-white dark:bg-zinc-950 border-blue-200 dark:border-blue-800 shadow-sm'}
                                    `}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className={`text-sm font-medium leading-none ${!notification.is_read && 'text-foreground'}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/60">
                                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: es })}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
