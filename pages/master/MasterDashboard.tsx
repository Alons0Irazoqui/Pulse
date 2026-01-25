import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';

const MasterDashboard: React.FC = () => {
    // 1. Arquitectura de Datos (Local)
    const { students, monthlyRevenueData, rollingRevenueData, stats } = useStore();
    const navigate = useNavigate();
    
    // Selector de Tiempo
    const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');

    // --- LÓGICA DE NEGOCIO ---

    // 2. Lógica "Ingresos" (KPI Dinámico)
    const displayRevenue = useMemo(() => {
        if (timeRange === 'year') return stats.totalRevenue;
        // Si es mes, tomamos el último valor disponible en los datos rodantes (asumiendo mes actual)
        if (rollingRevenueData.length > 0) {
            return rollingRevenueData[rollingRevenueData.length - 1].total;
        }
        return 0;
    }, [timeRange, stats, rollingRevenueData]);

    // 3. Lógica "Alumnos Nuevos" (KPI Dinámico)
    const newStudentsCount = useMemo(() => {
        const now = new Date();
        const startOfPeriod = timeRange === 'month'
            ? new Date(now.getFullYear(), now.getMonth(), 1)
            : new Date(now.getFullYear(), 0, 1);

        return students.filter(s => {
            // joinDate viene como string (ej: "2023-08-15" o ISO), Date.parse lo maneja
            const joinDate = new Date(s.joinDate); 
            return joinDate >= startOfPeriod;
        }).length;
    }, [students, timeRange]);

    // 4. Datos Gráfica Principal (Ingresos)
    const revenueChartData = useMemo(() => {
        return timeRange === 'year' ? monthlyRevenueData : rollingRevenueData;
    }, [timeRange, monthlyRevenueData, rollingRevenueData]);

    // 5. Datos Donut (Grados con Colores Estáticos)
    const studentsByRank = useMemo(() => {
        const activeStudents = students.filter(s => s.status === 'active');
        const distribution: Record<string, number> = {};

        activeStudents.forEach(s => {
            distribution[s.rank] = (distribution[s.rank] || 0) + 1;
        });

        // Mapa de colores estáticos hexadecimales
        const getColor = (rankName: string) => {
            const lower = rankName.toLowerCase();
            if (lower.includes('white') || lower.includes('blanco')) return '#E5E7EB';
            if (lower.includes('yellow') || lower.includes('amarillo')) return '#FACC15';
            if (lower.includes('orange') || lower.includes('naranja')) return '#FB923C';
            if (lower.includes('green') || lower.includes('verde')) return '#4ADE80';
            if (lower.includes('blue') || lower.includes('azul')) return '#60A5FA';
            if (lower.includes('purple') || lower.includes('morado')) return '#A78BFA';
            if (lower.includes('brown') || lower.includes('marrón') || lower.includes('marron')) return '#A97142';
            if (lower.includes('black') || lower.includes('negro')) return '#1F2937';
            return '#CBD5E1'; // Default Gray
        };

        // Orden lógico aproximado para la visualización
        const orderMap: Record<string, number> = { 
            white: 1, yellow: 2, orange: 3, green: 4, blue: 5, purple: 6, brown: 7, black: 8 
        };

        return Object.entries(distribution).map(([name, value]) => {
            const key = Object.keys(orderMap).find(k => name.toLowerCase().includes(k)) || 'z';
            return {
                name,
                value,
                fill: getColor(name),
                order: orderMap[key] || 99
            };
        }).sort((a, b) => a.order - b.order);
    }, [students]);

    // 6. Total Cuentas por Cobrar
    const totalReceivable = stats.pendingCollection + stats.overdueAmount;

    // 7. Top Deudores (Alertas)
    const topDebtors = useMemo(() => {
        return students
            .filter(s => s.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5);
    }, [students]);

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full flex flex-col gap-8 animate-in fade-in duration-500">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-text-main">Dashboard</h1>
                    <p className="text-text-secondary mt-1">Resumen general de tu academia.</p>
                </div>
                
                {/* Selector de Tiempo (Segment Control) */}
                <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex">
                    <button 
                        onClick={() => setTimeRange('month')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                            timeRange === 'month' 
                            ? 'bg-gray-900 text-white shadow-md' 
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        Mensual
                    </button>
                    <button 
                        onClick={() => setTimeRange('year')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                            timeRange === 'year' 
                            ? 'bg-gray-900 text-white shadow-md' 
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        Anual
                    </button>
                </div>
            </div>

            {/* --- FILA 1: KPIs --- */}
            <div className="grid grid-cols-12 gap-6">
                
                {/* KPI 1: Ingresos */}
                <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ingresos ({timeRange === 'month' ? 'Mes' : 'Año'})</span>
                        <div className="size-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                            <span className="material-symbols-outlined">payments</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-text-main tracking-tight">
                            ${displayRevenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>

                {/* KPI 2: Alumnos Activos */}
                <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-40" onClick={() => navigate('/master/students')}>
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alumnos Activos</span>
                        <div className="size-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <span className="material-symbols-outlined">groups</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-text-main tracking-tight">
                            {stats.activeStudents}
                        </span>
                    </div>
                </div>

                {/* KPI 3: Alumnos Nuevos */}
                <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-40">
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alumnos Nuevos</span>
                        <div className="size-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <span className="material-symbols-outlined">person_add</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-text-main tracking-tight">
                            +{newStudentsCount}
                        </span>
                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {timeRange === 'month' ? 'Este Mes' : 'Este Año'}
                        </span>
                    </div>
                </div>

                {/* KPI 4: Cuentas por Cobrar */}
                <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-40 cursor-pointer hover:border-red-200 transition-colors" onClick={() => navigate('/master/finance')}>
                    <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Por Cobrar</span>
                        <div className="size-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                        </div>
                    </div>
                    <div>
                        <span className="text-3xl font-black text-text-main tracking-tight">
                            ${totalReceivable.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                        </span>
                        {stats.overdueAmount > 0 && (
                            <p className="text-[10px] font-bold text-red-500 mt-1">
                                ${stats.overdueAmount.toLocaleString()} Vencido
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* --- FILA 2: GRÁFICAS --- */}
            <div className="grid grid-cols-12 gap-6">
                
                {/* Gráfica Principal: Ingresos */}
                <div className="col-span-12 lg:col-span-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm min-h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-text-main mb-6">Ingresos</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#9CA3AF', fontSize: 11, fontWeight: 600}} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: '#9CA3AF', fontSize: 11}} 
                                    tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number) => [
                                        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value) || 0), 
                                        'Ingresos'
                                    ]}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    stroke="#007AFF" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfica Secundaria: Población por Grado */}
                <div className="col-span-12 lg:col-span-4 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm min-h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-text-main mb-2">Alumnos por Grado</h3>
                    <div className="flex-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={studentsByRank}
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={6}
                                >
                                    {studentsByRank.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                            <span className="text-4xl font-black text-text-main">{stats.activeStudents}</span>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total</span>
                        </div>
                    </div>
                    {/* Leyenda Limpia */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {studentsByRank.map((rank) => (
                            <div key={rank.name} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-50 border border-gray-100">
                                <span className="size-2 rounded-full" style={{ backgroundColor: rank.fill }}></span>
                                <span className="text-[10px] font-bold text-gray-600">{rank.name} ({rank.value})</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- FILA 3: DETALLES (Alertas de Deuda) --- */}
            <div className="col-span-12 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-text-main flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500">warning</span>
                        Alertas de Deuda
                    </h3>
                    <button onClick={() => navigate('/master/finance')} className="text-sm font-bold text-primary hover:underline">Gestionar Todo</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {topDebtors.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <span className="material-symbols-outlined text-3xl mb-2">check_circle</span>
                            <p className="text-sm font-medium">¡Sin deudores críticos!</p>
                        </div>
                    ) : (
                        topDebtors.map(debtor => (
                            <div key={debtor.id} className="p-4 rounded-2xl bg-red-50/50 border border-red-100 hover:shadow-md transition-all cursor-pointer group" onClick={() => navigate('/master/finance')}>
                                <div className="flex items-center gap-3 mb-3">
                                    <Avatar src={debtor.avatarUrl} name={debtor.name} className="size-10 rounded-full" />
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-bold text-gray-900 truncate">{debtor.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{debtor.email}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-end border-t border-red-100 pt-3">
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Pendiente</span>
                                    <span className="text-lg font-black text-red-600 group-hover:scale-105 transition-transform">
                                        ${debtor.balance.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
};

export default MasterDashboard;