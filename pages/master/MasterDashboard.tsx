
import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Defs, LinearGradient } from 'recharts';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/ui/Avatar';
import { 
    format, 
    subMonths, 
    subYears,
    addMonths,
    addYears,
    isSameMonth, 
    isSameYear, 
    startOfYear, 
    endOfYear, 
    eachMonthOfInterval, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval,
    isValid,
    isAfter,
    getDate,
    getMonth,
    getYear
} from 'date-fns';
import { es } from 'date-fns/locale';

type TimeRange = 'month' | 'year';

const MasterDashboard: React.FC = () => {
  const { students, records, isLoading } = useStore();
  const navigate = useNavigate();
  
  // --- STATE ---
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [currentDate, setCurrentDate] = useState(new Date()); 
  
  // Force re-render on data change ensures real-time feel
  const [triggerRender, setTriggerRender] = useState(0);

  // --- AUTO-DETECT LATEST DATA ON LOAD ---
  useEffect(() => {
      if (records.length > 0) {
          const validDates = records
              .filter(r => r.status === 'paid' && (r.paymentDate || r.dueDate))
              .map(r => new Date(r.paymentDate || r.dueDate))
              .sort((a,b) => b.getTime() - a.getTime()); // Newest first

          if (validDates.length > 0) {
              const newest = validDates[0];
              const now = new Date();
              // If newest data is in the future relative to now, or significantly far, jump to it
              if (isAfter(newest, now) || !isSameMonth(newest, now)) {
                  setCurrentDate(newest);
              }
          }
      }
      setTriggerRender(prev => prev + 1);
  }, [records.length]); 

  // --- DATA PROCESSING ENGINE ---

  // 1. Critical Debtors (Top 5)
  const criticalDebtors = useMemo(() => {
      return students
          .filter(s => s.balance > 0 && s.status !== 'inactive')
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 5);
  }, [students, triggerRender]);

  // 2. Dynamic KPI & Chart Calculation
  const dashboardData = useMemo(() => {
      // Helper: Parse any date string safely to Date object avoiding UTC shifts
      const safeDate = (dateStr: string | null | undefined): Date | null => {
          if (!dateStr) return null;
          if (dateStr.includes('T')) return new Date(dateStr); // ISO
          const [y, m, d] = dateStr.split('-').map(Number);
          return new Date(y, m - 1, d, 12, 0, 0); // Local noon to match day
      };

      // Helper: Get Revenue Amount correctly (handling paid records being 0)
      const getRevenueAmount = (r: any) => {
          const base = r.originalAmount !== undefined ? r.originalAmount : r.amount;
          const penalty = r.penaltyAmount || 0;
          return base + penalty;
      };

      // --- 1. REVENUE CALCULATION ---
      let currentRevenue = 0;
      let previousRevenue = 0;
      let chartData: { name: string; value: number; fullDate?: string }[] = [];

      // Filter only valid PAID records or APPROVED partials
      const revenueRecords = records.filter(r => r.status === 'paid');

      if (timeRange === 'year') {
          // YEAR VIEW
          const currentYearStart = startOfYear(currentDate);
          const currentYearEnd = endOfYear(currentDate);
          const lastYearDate = subYears(currentDate, 1);
          
          // Calculate Totals
          revenueRecords.forEach(r => {
              const pDate = safeDate(r.paymentDate) || safeDate(r.dueDate);
              if (!pDate) return;

              const amount = getRevenueAmount(r);

              if (isSameYear(pDate, currentDate)) {
                  currentRevenue += amount;
              } else if (isSameYear(pDate, lastYearDate)) {
                  previousRevenue += amount;
              }
          });

          // Generate Chart (Months)
          const months = eachMonthOfInterval({ start: currentYearStart, end: currentYearEnd });
          
          chartData = months.map(month => {
              const monthlyTotal = revenueRecords
                  .filter(r => {
                      const pDate = safeDate(r.paymentDate) || safeDate(r.dueDate);
                      return pDate && isSameMonth(pDate, month) && isSameYear(pDate, month);
                  })
                  .reduce((sum, r) => sum + getRevenueAmount(r), 0);

              return {
                  name: format(month, 'MMM', { locale: es }),
                  value: monthlyTotal,
                  fullDate: month.toISOString()
              };
          });

      } else {
          // MONTH VIEW
          const currentMonthStart = startOfMonth(currentDate);
          const currentMonthEnd = endOfMonth(currentDate);
          const lastMonthDate = subMonths(currentDate, 1);

          // Calculate Totals
          revenueRecords.forEach(r => {
              const pDate = safeDate(r.paymentDate) || safeDate(r.dueDate);
              if (!pDate) return;

              const amount = getRevenueAmount(r);

              if (isSameMonth(pDate, currentDate) && isSameYear(pDate, currentDate)) {
                  currentRevenue += amount;
              } else if (isSameMonth(pDate, lastMonthDate) && isSameYear(pDate, lastMonthDate)) {
                  previousRevenue += amount;
              }
          });

          // Generate Chart (Days - Cumulative "Mountain")
          const days = eachDayOfInterval({ start: currentMonthStart, end: currentMonthEnd });
          let runningTotal = 0;

          chartData = days.map(day => {
              // Only sum payments exactly on this day
              const dailyTotal = revenueRecords
                  .filter(r => {
                      const pDate = safeDate(r.paymentDate) || safeDate(r.dueDate);
                      return pDate && 
                             getDate(pDate) === getDate(day) && 
                             getMonth(pDate) === getMonth(day) &&
                             getYear(pDate) === getYear(day);
                  })
                  .reduce((sum, r) => sum + getRevenueAmount(r), 0);
              
              runningTotal += dailyTotal;

              return {
                  name: format(day, 'd'),
                  value: runningTotal, // Cumulative for mountain effect
                  fullDate: day.toISOString()
              };
          });
      }

      // --- 2. ENROLLMENT CALCULATION ---
      let newStudents = 0;
      let prevStudents = 0;

      students.forEach(s => {
          const joinDate = safeDate(s.joinDate);
          if (!joinDate) return;

          if (timeRange === 'year') {
              if (isSameYear(joinDate, currentDate)) newStudents++;
              else if (isSameYear(joinDate, subYears(currentDate, 1))) prevStudents++;
          } else {
              if (isSameMonth(joinDate, currentDate) && isSameYear(joinDate, currentDate)) newStudents++;
              else if (isSameMonth(joinDate, subMonths(currentDate, 1)) && isSameYear(joinDate, subMonths(currentDate, 1))) prevStudents++;
          }
      });

      // --- 3. TRENDS ---
      const revenueTrend = previousRevenue === 0 ? (currentRevenue > 0 ? 100 : 0) : ((currentRevenue - previousRevenue) / previousRevenue) * 100;
      const enrollmentTrend = prevStudents === 0 ? (newStudents > 0 ? 100 : 0) : ((newStudents - prevStudents) / prevStudents) * 100;

      // --- 4. DEBT ---
      const totalPendingDebt = students
          .filter(s => s.status !== 'inactive')
          .reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0);

      return {
          revenue: currentRevenue,
          revenueTrend,
          newStudents,
          enrollmentTrend,
          activeStudents: students.filter(s => s.status === 'active' || s.status === 'debtor').length,
          pendingDebt: totalPendingDebt,
          chartData
      };

  }, [records, students, timeRange, currentDate, triggerRender]);

  // --- ACTIONS ---
  
  const handlePrevPeriod = () => {
      if (timeRange === 'month') {
          setCurrentDate(subMonths(currentDate, 1));
      } else {
          setCurrentDate(subYears(currentDate, 1));
      }
  };

  const handleNextPeriod = () => {
      if (timeRange === 'month') {
          setCurrentDate(addMonths(currentDate, 1));
      } else {
          setCurrentDate(addYears(currentDate, 1));
      }
  };

  // KPI Definition
  const kpis = [
      {
          label: 'Ingresos Totales',
          value: `$${dashboardData.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          trend: dashboardData.revenueTrend,
          icon: 'payments',
          color: 'text-green-400',
          bg: 'bg-green-500/10'
      },
      {
          label: 'Alumnos Activos',
          value: dashboardData.activeStudents,
          trend: 0, 
          icon: 'groups',
          color: 'text-blue-400',
          bg: 'bg-blue-500/10'
      },
      {
          label: timeRange === 'month' ? 'Nuevos (Mes)' : 'Nuevos (Año)',
          value: dashboardData.newStudents,
          trend: dashboardData.enrollmentTrend,
          icon: 'person_add',
          color: 'text-purple-400',
          bg: 'bg-purple-500/10'
      },
      {
          label: 'Deuda Pendiente',
          value: `$${dashboardData.pendingDebt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
          trend: 0,
          icon: 'warning',
          color: 'text-orange-400',
          bg: 'bg-orange-500/10',
          isInverse: true
      }
  ];

  // Skeleton Loader
  if (isLoading) {
      return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full animate-pulse">
            <div className="h-8 w-48 bg-zinc-800 rounded-lg mb-8"></div>
            <div className="grid grid-cols-4 gap-6 mb-8">
                {[1,2,3,4].map(i => <div key={i} className="h-32 bg-background-paper rounded-3xl"></div>)}
            </div>
            <div className="h-96 bg-background-paper rounded-3xl"></div>
        </div>
      );
  }

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-white">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                    Dashboard
                    <span className="text-lg font-medium text-text-secondary bg-background-subtle border border-border px-3 py-1 rounded-lg">
                        {timeRange === 'month' 
                            ? format(currentDate, 'MMMM yyyy', { locale: es }) 
                            : format(currentDate, 'yyyy')}
                    </span>
                </h1>
                <p className="text-text-secondary mt-1">
                    Vista general de tu academia en tiempo real.
                </p>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Date Navigator Controls */}
                <div className="flex bg-background-paper border border-border rounded-xl p-1 shadow-sm">
                    <button onClick={handlePrevPeriod} className="p-2 hover:bg-background-subtle rounded-lg text-text-secondary hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-xl">chevron_left</span>
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold text-white hover:bg-background-subtle rounded-lg transition-colors border-x border-transparent hover:border-border">
                        Hoy
                    </button>
                    <button onClick={handleNextPeriod} className="p-2 hover:bg-background-subtle rounded-lg text-text-secondary hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-xl">chevron_right</span>
                    </button>
                </div>

                {/* View Toggle */}
                <div className="bg-background-paper border border-border rounded-xl p-1 flex shadow-sm">
                    <button 
                        onClick={() => setTimeRange('month')}
                        className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
                            timeRange === 'month' 
                            ? 'bg-white text-black shadow-md' 
                            : 'text-text-secondary hover:text-white hover:bg-background-subtle'
                        }`}
                    >
                        Mensual
                    </button>
                    <button 
                        onClick={() => setTimeRange('year')}
                        className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
                            timeRange === 'year' 
                            ? 'bg-white text-black shadow-md' 
                            : 'text-text-secondary hover:text-white hover:bg-background-subtle'
                        }`}
                    >
                        Anual
                    </button>
                </div>
            </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, idx) => {
                const hasTrend = kpi.trend !== 0 && !isNaN(kpi.trend) && isFinite(kpi.trend);
                const isPositive = kpi.trend > 0;
                const isBadTrend = kpi.isInverse ? isPositive : !isPositive; 
                
                return (
                    <div key={idx} className="bg-background-paper p-6 rounded-2xl shadow-card border border-border flex flex-col justify-between hover:-translate-y-1 transition-transform duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`size-12 rounded-xl flex items-center justify-center ${kpi.bg} ${kpi.color}`}>
                                <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
                            </div>
                            {hasTrend && (
                                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isBadTrend ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    <span className="material-symbols-outlined text-sm">{isPositive ? 'trending_up' : 'trending_down'}</span>
                                    {Math.abs(kpi.trend).toFixed(1)}%
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{kpi.label}</p>
                            <h3 className="text-3xl font-black text-white mt-1 tracking-tight">{kpi.value}</h3>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* Chart & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Chart */}
            <div className="lg:col-span-2 bg-background-paper p-8 rounded-2xl shadow-card border border-border flex flex-col h-[450px]">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-white">
                            {timeRange === 'month' ? 'Crecimiento de Ingresos' : 'Historial de Ingresos'}
                        </h3>
                        <p className="text-sm text-text-secondary capitalize">
                            {timeRange === 'month' 
                                ? `Acumulado diario - ${format(currentDate, 'MMMM yyyy', { locale: es })}`
                                : `Rendimiento mensual - ${format(currentDate, 'yyyy')}`}
                        </p>
                    </div>
                    {/* Dynamic total badge in chart header */}
                    <div className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-sm font-bold">
                        Total: ${dashboardData.revenue.toLocaleString()}
                    </div>
                </div>
                
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#a3a3a3', fontSize: 11, fontWeight: 600}} 
                                dy={10}
                                interval={timeRange === 'month' ? 4 : 0} 
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#a3a3a3', fontSize: 11}} 
                                tickFormatter={(value) => value >= 1000 ? `$${value/1000}k` : `$${value}`}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#141414', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)', padding: '12px 16px' }}
                                cursor={{ stroke: '#f97316', strokeWidth: 2, strokeDasharray: '4 4' }}
                                formatter={(value: number) => [`$${value.toLocaleString()}`, timeRange === 'month' ? 'Acumulado' : 'Ingresos']}
                                labelStyle={{ color: '#a3a3a3', marginBottom: '4px', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}
                                itemStyle={{ color: '#FFFFFF' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#f97316" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorRevenue)" 
                                animationDuration={1000}
                                animationEasing="ease-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Critical Alerts */}
            <div className="bg-background-paper p-8 rounded-2xl shadow-card border border-border flex flex-col h-[450px]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            Alertas de Deuda
                            {criticalDebtors.length > 0 && <span className="flex size-2 rounded-full bg-red-500 animate-pulse"></span>}
                        </h3>
                        <p className="text-sm text-text-secondary">Mayor riesgo financiero global.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {criticalDebtors.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-60 text-center">
                            <div className="size-16 bg-background-subtle rounded-full flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-3xl text-text-muted">check_circle</span>
                            </div>
                            <p className="text-sm font-medium">Sin deudas críticas.</p>
                            <p className="text-xs">¡Excelente gestión!</p>
                        </div>
                    ) : (
                        criticalDebtors.map(debtor => (
                            <div key={debtor.id} className="flex items-center justify-between p-4 rounded-xl bg-background-subtle border border-border hover:border-red-500/30 hover:bg-red-500/5 transition-all group cursor-pointer" onClick={() => navigate('/master/finance')}>
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Avatar src={debtor.avatarUrl} name={debtor.name} className="size-10 rounded-full shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{debtor.name}</p>
                                        <p className="text-xs text-red-400 font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">warning</span>
                                            ${debtor.balance.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <span className="material-symbols-outlined text-text-muted group-hover:text-red-400 transition-colors">chevron_right</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-6 border-t border-border mt-auto">
                    <button 
                        onClick={() => navigate('/master/finance')}
                        className="w-full py-3 rounded-lg bg-white text-black font-bold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        Gestionar Cobranza
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};

export default MasterDashboard;
