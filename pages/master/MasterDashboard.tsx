
import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { getLocalDate } from '../../utils/dateUtils';

const MasterDashboard: React.FC = () => {
    // 1. Arquitectura de Datos (Local)
    const { students, monthlyRevenueData, rollingRevenueData, stats, events, markAttendance } = useStore();
    const navigate = useNavigate();
    
    // Selector de Tiempo
    const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');
    
    // Estado para Asistencia Rápida
    const [attendanceSearch, setAttendanceSearch] = useState('');

    // --- LÓGICA DE NEGOCIO ---

    // 2. Lógica "Ingresos" (KPI Dinámico)
    const displayRevenue = useMemo(() => {
        if (timeRange === 'year') return stats.totalRevenue;
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
            const joinDate = new Date(s.joinDate); 
            return joinDate >= startOfPeriod;
        }).length;
    }, [students, timeRange]);

    // 4. Datos Gráfica Principal (Ingresos)
    const revenueChartData = useMemo(() => {
        return timeRange === 'year' ? monthlyRevenueData : rollingRevenueData;
    }, [timeRange, monthlyRevenueData, rollingRevenueData]);

    // 5. Datos Donut (Grados)
    const studentsByRank = useMemo(() => {
        const activeStudents = students.filter(s => s.status === 'active');
        const distribution: Record<string, number> = {};

        activeStudents.forEach(s => {
            distribution[s.rank] = (distribution[s.rank] || 0) + 1;
        });

        const getColor = (rankName: string) => {
            const lower = rankName.toLowerCase();
            if (lower.includes('white')) return '#E5E7EB'; // Gray 200
            if (lower.includes('yellow')) return '#FDE68A'; // Amber 200
            if (lower.includes('orange')) return '#FB923C'; // Orange 400
            if (lower.includes('green')) return '#86EFAC'; // Green 300
            if (lower.includes('blue')) return '#93C5FD'; // Blue 300
            if (lower.includes('purple')) return '#C4B5FD'; // Violet 300
            if (lower.includes('brown')) return '#A97142'; // Brown
            if (lower.includes('black')) return '#1F2937'; // Gray 800
            return '#CBD5E1';
        };

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

    // --- NUEVAS LÓGICAS PARA WIDGETS ---

    // Badges Counters
    const debtorsCount = useMemo(() => students.filter(s => s.balance > 0).length, [students]);
    const examReadyCount = useMemo(() => students.filter(s => s.status === 'exam_ready').length, [students]);

    // Próximos Eventos (Top 3)
    const upcomingEvents = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return events
            .filter(e => e.date >= today)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3);
    }, [events]);

    // Alumnos Recientes (Top 5)
    const recentStudents = useMemo(() => {
        return [...students]
            .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
            .slice(0, 5);
    }, [students]);

    // Resultados Búsqueda Asistencia
    const attendanceResults = useMemo(() => {
        if (attendanceSearch.length < 2) return [];
        return students
            .filter(s => s.status === 'active' && s.name.toLowerCase().includes(attendanceSearch.toLowerCase()))
            .slice(0, 4);
    }, [students, attendanceSearch]);

    const handleQuickMark = (studentId: string) => {
        const today = getLocalDate();
        markAttendance(studentId, 'quick-access', today, 'present');
        setAttendanceSearch(''); 
    };

    return (
        <div className="bg-gray-50 min-h-full p-6 lg:p-8 font-sans text-gray-900 animate-in fade-in duration-500">
            
            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1 font-medium">Visión general del rendimiento de tu academia.</p>
                </div>
                
                {/* Time Control */}
                <div className="bg-white p-1.5 rounded-2xl border border-gray-200 flex shadow-sm hover:shadow-md transition-shadow">
                    <button 
                        onClick={() => setTimeRange('month')}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                            timeRange === 'month' 
                            ? 'bg-gray-100 text-gray-900 shadow-inner' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Mensual
                    </button>
                    <button 
                        onClick={() => setTimeRange('year')}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                            timeRange === 'year' 
                            ? 'bg-gray-100 text-gray-900 shadow-inner' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        Anual
                    </button>
                </div>
            </div>

            {/* --- BENTO GRID SYSTEM --- */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* --- FILA 1: KPIs & ACCESOS RÁPIDOS --- */}
                
                {/* KPIS PRINCIPALES (Cols 1-8) */}
                <div className="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* KPI 1: Activos */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col justify-between h-32 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className="size-10 bg-blue-50/50 text-blue-600 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-[22px]">groups</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Población</span>
                        </div>
                        <div>
                            <span className="text-3xl font-black text-gray-900 block tracking-tight">{stats.activeStudents}</span>
                            <span className="text-xs font-medium text-gray-400">Alumnos Activos</span>
                        </div>
                    </div>

                    {/* KPI 2: Ingresos */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col justify-between h-32 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className="size-10 bg-orange-50/50 text-orange-600 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-[22px]">payments</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ingresos</span>
                        </div>
                        <div>
                            <span className="text-3xl font-black text-gray-900 block tracking-tight">
                                ${displayRevenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs font-medium text-gray-400">Total Recaudado</span>
                        </div>
                    </div>

                    {/* KPI 3: Nuevos */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col justify-between h-32 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className="flex justify-between items-start">
                            <div className="size-10 bg-green-50/50 text-green-600 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-[22px]">person_add</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Crecimiento</span>
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-black text-gray-900 block tracking-tight">+{newStudentsCount}</span>
                            <span className="text-[10px] font-bold text-green-600 bg-green-50/50 px-2 py-0.5 rounded-full mb-1">Nuevos</span>
                        </div>
                    </div>

                    {/* KPI 4: Adeudos */}
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 flex flex-col justify-between h-32 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => navigate('/master/finance')}>
                        <div className="flex justify-between items-start">
                            <div className="size-10 bg-red-50/50 text-red-500 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-[22px]">account_balance_wallet</span>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Por Cobrar</span>
                        </div>
                        <div>
                            <span className="text-3xl font-black text-gray-900 block tracking-tight">
                                ${totalReceivable.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                            </span>
                            <span className="text-xs font-bold text-red-500">Pendiente Total</span>
                        </div>
                    </div>
                </div>

                {/* BADGES INTERACTIVOS (Cols 9-12) - REDESIGNED */}
                <div className="col-span-12 lg:col-span-4 grid grid-cols-2 gap-4">
                    
                    {/* Badge 1: Deudores (Red Accent) */}
                    <button 
                        onClick={() => navigate('/master/finance')}
                        className="bg-white rounded-2xl p-5 border border-gray-100 border-l-[6px] border-l-red-500 cursor-pointer group hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between h-32 text-left relative overflow-hidden"
                    >
                        <div className="absolute right-0 top-0 p-3 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <span className="material-symbols-outlined text-7xl">warning</span>
                        </div>
                        
                        <div className="flex justify-between items-start w-full relative z-10">
                            <div className="size-9 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[18px] filled">priority_high</span>
                            </div>
                        </div>
                        <div className="relative z-10">
                            <span className="text-3xl font-black text-gray-900 block leading-none mb-1 group-hover:text-red-600 transition-colors">{debtorsCount}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide group-hover:text-gray-600">Pagos Pendientes</span>
                        </div>
                    </button>

                    {/* Badge 2: Examen (Blue Accent) */}
                    <button 
                        onClick={() => navigate('/master/students')}
                        className="bg-white rounded-2xl p-5 border border-gray-100 border-l-[6px] border-l-blue-500 cursor-pointer group hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 flex flex-col justify-between h-32 text-left relative overflow-hidden"
                    >
                        <div className="absolute right-0 top-0 p-3 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <span className="material-symbols-outlined text-7xl">workspace_premium</span>
                        </div>

                        <div className="flex justify-between items-start w-full relative z-10">
                            <div className="size-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                                <span className="material-symbols-outlined text-[18px] filled">check</span>
                            </div>
                        </div>
                        <div className="relative z-10">
                            <span className="text-3xl font-black text-gray-900 block leading-none mb-1 group-hover:text-blue-600 transition-colors">{examReadyCount}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide group-hover:text-gray-600">Listos Examen</span>
                        </div>
                    </button>
                </div>


                {/* --- FILA 2: GRÁFICAS --- */}

                {/* Gráfica Principal: Ingresos (Cols 1-8) */}
                <div className="col-span-12 lg:col-span-8 bg-white rounded-3xl border border-gray-100 p-8 min-h-[400px] flex flex-col hover:shadow-2xl transition-all duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Flujo de Ingresos</h3>
                            <p className="text-xs text-gray-400 mt-1 font-medium">Comportamiento financiero del periodo seleccionado</p>
                        </div>
                        <span className="text-2xl font-black text-gray-900 tracking-tight bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                            ${displayRevenue.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
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
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px 16px' }}
                                    formatter={(value: number) => [
                                        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value) || 0), 
                                        'Ingresos'
                                    ]}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="total" 
                                    stroke="#F97316" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#colorRevenue)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfica Secundaria: Población (Cols 9-12) */}
                <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-gray-100 p-8 min-h-[400px] flex flex-col hover:shadow-2xl transition-all duration-500">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Población por Grado</h3>
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
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Stats */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                            <span className="text-5xl font-black text-gray-900 tracking-tighter">{stats.activeStudents}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Total</span>
                        </div>
                    </div>
                    {/* Legend */}
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                        {studentsByRank.slice(0, 6).map((rank) => (
                            <div key={rank.name} className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                                <span className="size-2 rounded-full shadow-sm" style={{ backgroundColor: rank.fill }}></span>
                                <span className="text-[10px] font-bold text-gray-600 truncate max-w-[80px]">{rank.name}</span>
                            </div>
                        ))}
                    </div>
                </div>


                {/* --- FILA 3: LISTAS Y HERRAMIENTAS --- */}

                {/* Col 1-4: Próximos Eventos */}
                <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-gray-100 p-6 flex flex-col h-full hover:shadow-2xl transition-all duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-orange-500 text-[22px]">calendar_month</span>
                            Próximos Eventos
                        </h3>
                    </div>
                    <div className="flex-1 flex flex-col gap-4">
                        {upcomingEvents.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs italic bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                                <span className="material-symbols-outlined opacity-50 mb-2 text-2xl">event_busy</span>
                                Sin eventos próximos
                            </div>
                        ) : (
                            upcomingEvents.map(evt => (
                                <div key={evt.id} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 group cursor-default">
                                    <div className="flex flex-col items-center justify-center size-14 bg-gray-50 text-gray-600 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:shadow-sm transition-all shrink-0">
                                        <span className="text-[10px] font-black uppercase text-gray-400">{new Date(evt.date).toLocaleDateString('es-ES', {month: 'short'})}</span>
                                        <span className="text-xl font-black leading-none text-gray-900">{new Date(evt.date).getDate()}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{evt.title}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold bg-gray-100 w-fit px-2 py-0.5 rounded mt-1">{evt.type}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button 
                        onClick={() => navigate('/master/schedule')}
                        className="mt-6 w-full py-3 rounded-xl border-2 border-gray-100 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                    >
                        Ver Calendario Completo
                    </button>
                </div>

                {/* Col 5-8: Alumnos Recientes */}
                <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-gray-100 p-6 flex flex-col h-full hover:shadow-2xl transition-all duration-500">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-500 text-[22px]">person_add</span>
                            Alumnos Recientes
                        </h3>
                    </div>
                    <div className="flex-1 flex flex-col gap-3">
                        {recentStudents.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-xs italic bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">
                                Sin registros recientes
                            </div>
                        ) : (
                            recentStudents.map(student => (
                                <div key={student.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-default">
                                    <Avatar src={student.avatarUrl} name={student.name} className="size-10 rounded-full text-xs border border-gray-200 shadow-sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-gray-900 truncate">{student.name}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">{student.rank}</p>
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                                        {new Date(student.joinDate).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <button 
                        onClick={() => navigate('/master/students')}
                        className="mt-6 w-full py-3 rounded-xl border-2 border-gray-100 text-xs font-bold text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                    >
                        Ver Directorio
                    </button>
                </div>

                {/* Col 9-12: Asistencia Rápida */}
                <div className="col-span-12 lg:col-span-4 bg-white rounded-3xl border border-gray-100 p-6 flex flex-col h-full relative overflow-hidden hover:shadow-2xl transition-all duration-500 group">
                    <div className="flex justify-between items-center mb-6 relative z-10">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-500 text-[22px]">qr_code_scanner</span>
                            Asistencia Rápida
                        </h3>
                    </div>
                    
                    <div className="relative z-10">
                        <div className="relative mb-4 group/search">
                            <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400 group-focus-within/search:text-green-500 transition-colors">search</span>
                            <input 
                                type="text"
                                value={attendanceSearch}
                                onChange={(e) => setAttendanceSearch(e.target.value)}
                                placeholder="Escribe para buscar..."
                                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border-none text-sm font-medium focus:bg-white focus:ring-4 focus:ring-green-500/10 transition-all outline-none placeholder:text-gray-400"
                            />
                        </div>

                        <div className="flex flex-col gap-2 min-h-[180px]">
                            {attendanceSearch.length > 1 && attendanceResults.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-xs text-gray-400 font-medium">No se encontraron alumnos activos.</p>
                                </div>
                            )}
                            
                            {attendanceSearch.length <= 1 && (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                                    <span className="material-symbols-outlined text-5xl mb-2 opacity-50 group-hover:scale-110 transition-transform duration-500">touch_app</span>
                                    <p className="text-xs font-medium">Usa el buscador para registrar</p>
                                </div>
                            )}

                            {attendanceResults.map(student => (
                                <div key={student.id} className="flex items-center justify-between p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:border-green-200 hover:shadow-md transition-all">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <Avatar src={student.avatarUrl} name={student.name} className="size-9 rounded-full text-xs" />
                                        <div className="truncate">
                                            <p className="text-sm font-bold text-gray-900 truncate">{student.name}</p>
                                            <p className="text-[10px] text-gray-500 font-medium">{student.rank}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleQuickMark(student.id)}
                                        className="size-9 rounded-xl bg-green-50 text-green-600 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-90"
                                        title="Marcar Asistencia"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">check</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Decor */}
                    <div className="absolute -bottom-20 -right-20 size-60 bg-green-50 rounded-full blur-[80px] opacity-0 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none"></div>
                </div>

            </div>
        </div>
    );
};

export default MasterDashboard;
