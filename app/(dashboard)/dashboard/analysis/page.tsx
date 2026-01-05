export const dynamic = 'force-dynamic';
import { AnalysisBoard } from '@/components/analysis/analysis-board';
import { Metadata } from 'next';
import { getDashboardData } from '@/app/actions/analysis/get-kpis';
import { DashboardProvider } from '@/components/analysis/dashboard-context';

export const metadata: Metadata = {
    title: 'Analisis Personalizado | Lumio Finance',
    description: 'Tablero de control financiero avanzado y personalizable.',
};

export default async function AnalysisPage() {
    const dashboardData = await getDashboardData();

    return (
        <div className="relative">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-rose-400/10 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.08),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(244,63,94,0.08),transparent_40%)]" />
            </div>

            <div className="relative z-10 flex flex-col gap-6">
                <DashboardProvider data={dashboardData}>
                    <AnalysisBoard />
                </DashboardProvider>
            </div>
        </div>
    );
}
