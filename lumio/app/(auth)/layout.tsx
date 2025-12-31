
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/50 p-4">
            <div className="w-full max-w-md animate-fade-in">
                {children}
            </div>
        </div>
    )
}
