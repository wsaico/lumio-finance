import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDashboard } from '../dashboard-context';

export function AccountsListWidget() {
    const { data } = useDashboard();
    const accounts = data?.accounts || [];

    return (
        <Card className="relative h-full w-full overflow-hidden rounded-2xl border border-white/30 bg-white/70 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.6)] backdrop-blur-xl dark:border-white/5 dark:bg-zinc-900/60">
            <div className="px-4 pt-4 pb-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Detalle</p>
                <h3 className="text-base font-semibold text-foreground">Mis Cuentas</h3>
            </div>
            <ScrollArea className="h-full px-4 pb-4 pt-1">
                <div className="space-y-2">
                    {accounts.length === 0 && (
                        <div className="text-center text-muted-foreground text-xs py-8">
                            No tienes cuentas registradas.
                        </div>
                    )}
                    {accounts.map((acc, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between rounded-xl border border-transparent bg-white/40 p-2 transition hover:border-zinc-200/60 hover:bg-white/60 dark:bg-white/5 dark:hover:border-zinc-700/60"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-300 text-xs font-bold text-slate-700 flex items-center justify-center dark:from-zinc-800 dark:to-zinc-700 dark:text-white">
                                    {acc.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground truncate">{acc.name}</p>
                                    <p className="text-xs text-muted-foreground mt-1 capitalize truncate">
                                        {(acc.type || 'cuenta').toLowerCase()}
                                    </p>
                                </div>
                            </div>
                            <span className="font-semibold text-xs tracking-tight text-foreground whitespace-nowrap">
                                {acc.currency} {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    );
}
