import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';

const MasterDashboard: React.FC = () => {
  const { stats, students, isLoading } = useStore();
  const navigate = useNavigate();

  // --- DATA PROCESSING ---

  // 1. Critical Debtors (Top 5)
  const criticalDebtors = useMemo(() => {
      return students
          .filter(s => s.balance > 0)
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 5);
  }, [students]);

  // 2. KPI Data Construction
  const kpis = [
      {
          label: 'Ingresos Totales',
          value: `$${stats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          trend: 12.5, // Mock trend for demo, can be calculated if historical data exists
          icon: 'payments',
          color: 'text-green-600',
          bg: 'bg-green-50',
          chartColor: '#16a34a'
      },
      {
          label: 'Alumnos Activos',
          value: stats.activeStudents,
          trend: 4.2,
          icon: 'groups',
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          chartColor: '#2563eb'
      },
      {
          label: 'Tasa de Retención',
          value: `${stats.retentionRate.toFixed(1)}%`,
          trend: -1.5, // Negative trend example
          icon: 'anchor',
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          chartColor: '#9333ea'
      },
      {
          label: 'Deuda Pendiente',
          value: `$${students.reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0).toLocaleString()}`,
          trend: 8.0, // Rising debt is bad/warning
          icon: 'warning',
          color: 'text-orange-600',
          bg: 'bg-orange-50',
          isInverse: true // Positive number is bad
      }
  ];

  // --- SKELETON COMPONENT ---
  const DashboardSkeleton = () => (
      <div className="animate-pulse flex flex-col gap-8 w-full">
          <div className="h-10 w-48 bg-gray-200 rounded-xl mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-40 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                      <div className="h-10 w-10 bg-gray-100 rounded-xl mb-4"></div>
                      <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 w-20 bg-gray-100 rounded"></div>
                  </div>
              ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm"></div>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm"></div>
          </div>
      </div>
  );

  if (isLoading) return <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full"><DashboardSkeleton /></div>;

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-text-main">Dashboard</h1>
                <p className="text-text-secondary mt-1">Análisis financiero y métricas de rendimiento.</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-1 flex shadow-sm">
                <button className="px-4 py-2 text-xs font-bold bg-gray-900 text-white rounded-lg shadow-md transition-all">Mensual</button>
                <button className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-main hover:bg-gray-50 rounded-lg transition-all">Anual</button>
            </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, idx) => {
                const isPositive = kpi.trend > 0;
                const isBadTrend = kpi.isInverse ? isPositive : !isPositive; // e.g. Debt going up is bad
                
                return (
                    <div key={idx} className="bg-white p-6 rounded-[1.5rem] shadow-card border border-gray-100 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`size-12 rounded-2xl flex items-center justify-center ${kpi.bg} ${kpi.color}`}>
                                <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isBadTrend ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                <span className="material-symbols-outlined text-sm">{isPositive ? 'trending_up' : 'trending_down'}</span>
                                {Math.abs(kpi.trend)}%
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{kpi.label}</p>
                            <h3 className="text-3xl font-black text-text-main mt-1 tracking-tight">{kpi.value}</h3>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Chart Section */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-card border border-gray-100 flex flex-col h-[450px]">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-text-main">Ingresos Mensuales</h3>
                        <p className="text-sm text-text-secondary">Rendimiento financiero del año en curso.</p>
                    </div>
                    <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <span className="material-symbols-outlined">bar_chart</span>
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.monthlyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#9CA3AF', fontSize: 12, fontWeight: 600}} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#9CA3AF', fontSize: 12}} 
                                tickFormatter={(value) => `$${value/1000}k`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                                cursor={{ stroke: '#007AFF', strokeWidth: 1, strokeDasharray: '4 4' }}
                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#007AFF" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorRevenue)" 
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#007AFF' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Critical Alerts Section */}
            <div className="bg-white p-8 rounded-[2rem] shadow-card border border-gray-100 flex flex-col h-[450px]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                            Alertas de Deuda
                            <span className="flex size-2 rounded-full bg-red-500 animate-pulse"></span>
                        </h3>
                        <p className="text-sm text-text-secondary">Mayor riesgo financiero.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {criticalDebtors.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                            <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
                            <p className="text-sm font-medium">Sin deudas críticas.</p>
                        </div>
                    ) : (
                        criticalDebtors.map(debtor => (
                            <div key={debtor.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-red-100 hover:bg-red-50/30 transition-all group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <img src={debtor.avatarUrl} className="size-10 rounded-full object-cover bg-gray-200 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-text-main truncate">{debtor.name}</p>
                                        <p className="text-xs text-red-500 font-bold">${debtor.balance.toLocaleString()}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => navigate('/master/communication', { state: { recipientId: debtor.id } })}
                                    className="size-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-colors shadow-sm"
                                    title="Enviar mensaje de cobro"
                                >
                                    <span className="material-symbols-outlined text-sm">send</span>
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-6 border-t border-gray-100 mt-auto">
                    <button 
                        onClick={() => navigate('/master/finance')}
                        className="w-full py-3 rounded-xl border-2 border-gray-100 text-text-main font-bold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                        Ver Reporte Financiero
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default MasterDashboard;