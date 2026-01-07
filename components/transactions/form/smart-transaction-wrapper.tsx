import { useState, useEffect } from "react"
import { useTransactionForm } from "./use-transaction-form"
import { TransactionBaseLayer } from "./transaction-base-layer"
import { TransactionWizardModal } from "./transaction-wizard-modal"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Trash2, Loader2, Sparkles, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface SmartTransactionWrapperProps {
    initialData?: any
    onSuccess?: () => void
    defaultOpenWizard?: boolean
}

export function SmartTransactionWrapper({ initialData, onSuccess, defaultOpenWizard = false }: SmartTransactionWrapperProps) {
    const {
        form,
        isWizardOpen,
        setIsWizardOpen,
        isCategoryPickerOpen,
        setIsCategoryPickerOpen,
        activeTab,
        setActiveTab,
        onSubmit,
        accounts,
        categories,
        goals,
        loans,
        deleteTransaction
    } = useTransactionForm(initialData, onSuccess)

    const isSubmitting = form.formState.isSubmitting
    const currentAccount = accounts?.find(a => a.id === form.watch('accountId'))
    const currencySymbol = currentAccount?.currencyCode === 'PEN' ? 'S/' : '$'

    const router = useRouter()
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

    return (
        <div className="fixed inset-0 lg:left-72 z-[45] bg-white dark:bg-zinc-950 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* 0. Header with Simplified Title */}
            <div className="px-10 py-6 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-4">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                        className="rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800"
                    >
                        <span className="text-2xl">←</span>
                    </Button>
                    <h1 className="text-3xl font-black tracking-tighter text-slate-800 dark:text-white">
                        {initialData ? 'Editar Transacción' : 'Nueva Transacción'}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {initialData && (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>

                            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                <AlertDialogContent className="rounded-3xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar transacción?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Se ajustará el saldo de tus cuentas automáticamente.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={async () => {
                                                await deleteTransaction.mutateAsync(initialData.id)
                                                if (onSuccess) onSuccess()
                                                else router.back()
                                            }}
                                            className="rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            Eliminar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}

                    {!initialData && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsWizardOpen(true)}
                            className="rounded-full font-bold text-slate-400 hover:text-primary transition-colors"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Asistente
                        </Button>
                    )}
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col relative bg-transparent overflow-hidden">

                    {/* 1. Content Area - Zero Scroll on Desktop */}
                    <div className="flex-1 overflow-y-auto lg:overflow-hidden px-4 lg:px-0 pt-2 pb-2 custom-scrollbar">
                        <div className="max-w-7xl mx-auto h-full">
                            <TransactionBaseLayer
                                form={form}
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                onOpenWizard={() => setIsWizardOpen(true)}
                                currencySymbol={currencySymbol}
                                accounts={accounts || []}
                                categories={categories || []}
                                goals={goals}
                                loans={loans}
                                isCategoryPickerOpen={isCategoryPickerOpen}
                                setIsCategoryPickerOpen={setIsCategoryPickerOpen}
                            />
                        </div>
                    </div>

                    {/* 2. Full-Width Bottom Action Bar (Image Reference Style) */}
                    <div
                        className="w-full border-t border-slate-200/60 dark:border-white/5 backdrop-blur-md px-10 py-5 flex justify-center items-center transition-colors duration-500 z-[60] relative pb-safe"
                        style={{ backgroundColor: `oklch(from var(${activeTab === 'EXPENSE' ? '--expense' : activeTab === 'INCOME' ? '--income' : '--savings'}) l c h / 0.08)` }}
                    >
                        <Button
                            type="submit"
                            disabled={isSubmitting || !form.watch('amount')}
                            className={cn(
                                "w-full max-w-4xl h-16 rounded-[2rem] text-xl font-black transition-all duration-300 shadow-lg active:scale-[0.98]",
                                activeTab === 'EXPENSE' && "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20",
                                activeTab === 'INCOME' && "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20",
                                activeTab === 'TRANSFER' && "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
                                isSubmitting && "opacity-50 grayscale"
                            )}
                        >
                            <div className="flex items-center justify-center gap-3">
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Check className="w-6 h-6" />
                                        <span>{initialData ? 'Actualizar Registro' : 'Completar Transacción'}</span>
                                    </div>
                                )}
                            </div>
                        </Button>
                    </div>

                    {/* 3. Wizard Modal (Optional but consistent) */}
                    <TransactionWizardModal
                        form={form}
                        isOpen={isWizardOpen}
                        onClose={() => setIsWizardOpen(false)}
                        onNextStep={() => setIsWizardOpen(false)}
                    />
                </form>
            </Form>
        </div>
    )
}
