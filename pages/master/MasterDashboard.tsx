import React from 'react';
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '../../context/StoreContext';

const MasterDashboard: React.FC = () => {
  const { stats } = useStore();

  // Use dynamic stats from context instead of mock values where possible
  const churnData = [
      { name: 'Activos', value: stats.activeStudents, color: '#34C759' }, // success
      { name: 'Inactivos', value: stats.activeStudents > 0 ? Math.round(stats.activeStudents * (stats.churnRate/100)) : 0, color: '#FF3B30' }  // danger
  ];

  return (
    <div className="layout-container flex flex-col w-full max-w-[1600px] mx-auto px-6 py-8 md:px-10 md:py-10 z-10 relative">
      {/* Dynamic Background Blurs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none translate-y-1/3 -translate-x-1/4"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 z-10">
        <div className="flex flex-col gap-2">
          <h2 className="text-4xl font-black tracking-tight text-text-main">Panel Financiero</h2>
          <p className="text-text-secondary text-base font-normal">Visión general en tiempo real de tu academia.</p>
        </div>
        <div className="flex gap-3">
          <button className="glass-panel flex items-center gap-2 h-11 px-5 rounded-xl text-text-main text-sm font-semibold hover:bg-white/80 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            <span>Este Mes</span>
          </button>
          <button className="bg-text-main text-white flex items-center gap-2 h-11 px-6 rounded-xl text-sm font-bold hover:bg-black/80 transition-all shadow-lg shadow-black/10 active:scale-95">
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span>Reporte</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 z-10">
        {[
          { label: 'Ingresos Totales', value: `$${stats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, trend: '+12%', color: 'blue', icon: 'payments' },
          { label: 'Alumnos Activos', value: stats.activeStudents.toString(), trend: '+5%', color: 'indigo', icon: 'person_add' },
          { label: 'Tasa Retención', value: `${stats.retentionRate.toFixed(1)}%`, trend: '+2%', color: 'green', icon: 'verified' },
          { label: 'Valor de Vida', value: '$1,200', trend: '+2%', color: 'purple', icon: 'savings' },
        ].map((stat, i) => (
          <div key={i} className="glass-card rounded-3xl p-6 flex flex-col justify-between h-44 group hover:-translate-y-1 transition-transform duration-500">
            <div className="flex justify-between items-start">
              <div className={`size-12 rounded-2xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600`}>
                <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
              </div>
              <span className="glass-panel px-3 py-1 text-xs font-bold text-green-700 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-text-secondary text-sm font-bold uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-3xl font-black text-text-main tracking-tight">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 z-10">
        <div className="xl:col-span-2 glass-card rounded-3xl p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold text-text-main">Proyección de Ingresos</h3>
              <p className="text-text-secondary text-sm">Ingresos mensuales aprobados</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#007AFF" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#007AFF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#86868B', fontSize: 12, fontWeight: 500}} dy={10} />
                <YAxis hide />
                <Tooltip 
                    cursor={{ stroke: '#007AFF', strokeWidth: 1, strokeDasharray: '5 5' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', padding: '12px 16px' }} 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
                />
                <Area type="monotone" dataKey="value" stroke="#007AFF" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-8 flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-text-main">Salud de Academia</h3>
                <p className="text-text-secondary text-sm">Churn Rate (Abandono)</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${stats.churnRate > 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  {stats.churnRate.toFixed(1)}%
              </div>
            </div>
            
            <div className="flex-1 min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={churnData}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#86868B'}} dy={10} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }} />
                        <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={48}>
                            {churnData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200/50">
                <p className="text-sm text-text-secondary text-center leading-relaxed">
                    {stats.churnRate > 5 
                        ? '⚠️ Alerta: Tasa de abandono elevada. Considera contactar a los alumnos inactivos.' 
                        : '✅ Excelente: Tu retención está por encima del promedio del mercado.'}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MasterDashboard;