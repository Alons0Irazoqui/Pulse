
import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, isSameDay, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAcademy } from '../../context/AcademyContext';
import { useStore } from '../../context/StoreContext';
import { CalendarEvent } from '../../types';
import YearView from '../../components/calendar/YearView';

// --- STYLES FOR RBC (Month & Agenda Only) ---
const calendarStyles = `
@import url('https://cdn.jsdelivr.net/npm/react-big-calendar@1.8.5/lib/css/react-big-calendar.css');

.rbc-calendar { font-family: 'Inter', sans-serif; border: none; }
.rbc-header { padding: 12px 0; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #9CA3AF; border-bottom: 1px solid #F3F4F6; }
.rbc-month-view { border: 1px solid #F3F4F6; border-radius: 24px; overflow: hidden; background: white; }
.rbc-day-bg + .rbc-day-bg { border-left: 1px solid #F3F4F6; }
.rbc-month-row + .rbc-month-row { border-top: 1px solid #F3F4F6; }
.rbc-off-range-bg { background: #FAFAFA; }
.rbc-today { background: #FFF7ED !important; } /* Orange-50 */
.rbc-event { border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: none; padding: 4px 8px; }
.rbc-toolbar { display: none; } /* Hide default toolbar to use custom one */
.rbc-agenda-view table.rbc-agenda-table { border: 1px solid #F3F4F6; border-radius: 24px; overflow: hidden; }
.rbc-agenda-view table.rbc-agenda-table thead > tr > th { border-bottom: 1px solid #F3F4F6; padding: 12px; }
.rbc-agenda-view table.rbc-agenda-table tbody > tr > td { padding: 12px; font-size: 14px; }
.rbc-agenda-time-cell { text-transform: lowercase; font-weight: 600; color: #6B7280; }
`;

// --- LOCALIZER ---
const locales = { 'es': es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// --- COMPONENT: EVENT CARD (Reused in Week/Day Views) ---
const ScheduleCard: React.FC<{ event: CalendarEvent; onClick: () => void }> = ({ event, onClick }) => {
    const isCancelled = event.status === 'cancelled';
    const isRescheduled = event.status === 'rescheduled';
    
    return (
        <div 
            onClick={onClick}
            className={`
                p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:shadow-lg group relative overflow-hidden
                ${isCancelled 
                    ? 'bg-red-50 border-red-100 opacity-70' 
                    : 'bg-white border-gray-100 hover:border-orange-200'}
            `}
        >
            {/* Left Color Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCancelled ? 'bg-red-400' : 'bg-primary'}`}></div>

            <div className="pl-3">
                <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isCancelled ? 'text-red-500 line-through' : 'text-primary'}`}>
                        {event.type === 'class' ? 'Clase' : event.type === 'exam' ? 'Examen' : 'Evento'}
                    </span>
                    {isCancelled && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">CANCELADA</span>}
                    {isRescheduled && <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full">REPROGRAMADA</span>}
                </div>
                
                <h3 className={`text-base font-bold text-gray-900 leading-tight mb-1 ${isCancelled ? 'line-through text-gray-500' : ''}`}>
                    {event.title}
                </h3>
                
                <div className="flex flex-col gap-1 text-sm text-gray-500 mt-2">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        <span>{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        <span className="truncate">{event.instructor || event.instructorName}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: CUSTOM WEEK VIEW (No Empty Hours) ---
const SimplifiedWeekView: React.FC<{ 
    date: Date; 
    events: CalendarEvent[]; 
    onEventClick: (e: CalendarEvent) => void 
}> = ({ date, events, onEventClick }) => {
    const start = startOfWeek(date, { weekStartsOn: 0 }); // Sunday start
    const days = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

    return (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 h-full overflow-y-auto">
            {days.map((day) => {
                const dayEvents = events
                    .filter(e => isSameDay(e.start, day))
                    .sort((a, b) => a.start.getTime() - b.start.getTime());
                const isToday = isSameDay(day, new Date());

                return (
                    <div key={day.toISOString()} className={`flex flex-col gap-3 min-h-[200px] md:min-h-full rounded-2xl p-2 ${isToday ? 'bg-orange-50/50' : ''}`}>
                        {/* Day Header */}
                        <div className="text-center pb-2 border-b border-gray-100 mb-2">
                            <p className="text-xs font-bold text-gray-400 uppercase">{format(day, 'EEE', { locale: es })}</p>
                            <div className={`size-8 mx-auto rounded-full flex items-center justify-center text-sm font-bold mt-1 ${isToday ? 'bg-primary text-white shadow-md' : 'text-gray-900'}`}>
                                {format(day, 'd')}
                            </div>
                        </div>

                        {/* Events Stack */}
                        <div className="flex flex-col gap-3">
                            {dayEvents.length > 0 ? (
                                dayEvents.map(evt => (
                                    <ScheduleCard key={evt.id} event={evt} onClick={() => onEventClick(evt)} />
                                ))
                            ) : (
                                <div className="text-center py-4 opacity-30">
                                    <span className="material-symbols-outlined text-2xl text-gray-400">do_not_disturb</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- COMPONENT: CUSTOM DAY VIEW (No Empty Hours) ---
const SimplifiedDayView: React.FC<{ 
    date: Date; 
    events: CalendarEvent[]; 
    onEventClick: (e: CalendarEvent) => void 
}> = ({ date, events, onEventClick }) => {
    const dayEvents = events
        .filter(e => isSameDay(e.start, date))
        .sort((a, b) => a.start.getTime() - b.start.getTime());

    return (
        <div className="max-w-2xl mx-auto w-full py-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
                {format(date, 'EEEE, d MMMM', { locale: es })}
            </h3>

            {dayEvents.length > 0 ? (
                <div className="flex flex-col gap-4 relative">
                    {/* Timeline Line */}
                    <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-100 -z-10 hidden md:block"></div>

                    {dayEvents.map((evt, idx) => (
                        <div key={evt.id} className="flex gap-6 items-start">
                            {/* Time Bubble (Desktop) */}
                            <div className="hidden md:flex flex-col items-center pt-2 min-w-[40px]">
                                <div className="size-10 bg-white border-4 border-gray-50 rounded-full flex items-center justify-center shadow-sm z-10">
                                    <div className="size-3 bg-primary rounded-full"></div>
                                </div>
                            </div>
                            
                            {/* Card */}
                            <div className="flex-1">
                                <ScheduleCard event={evt} onClick={() => onEventClick(evt)} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="size-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-4xl text-gray-300">self_improvement</span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">Día Libre</h4>
                    <p className="text-gray-500 text-sm mt-1">No tienes clases ni eventos programados para hoy.</p>
                </div>
            )}
        </div>
    );
};

// --- COMPONENT: EVENT DETAIL MODAL ---
const EventDetailModal: React.FC<{
    isOpen: boolean;
    event: CalendarEvent | null;
    onClose: () => void;
}> = ({ isOpen, event, onClose }) => {
    if (!isOpen || !event) return null;

    const isCancelled = event.status === 'cancelled';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
                
                {/* Header Decoration */}
                <div className={`h-28 ${isCancelled ? 'bg-red-500' : 'bg-gradient-to-br from-orange-500 to-orange-600'} relative overflow-hidden flex items-center justify-center`}>
                    <div className="absolute inset-0 opacity-20">
                        <span className="material-symbols-outlined text-[150px] -top-10 -right-10 absolute rotate-12">event</span>
                    </div>
                    <div className="relative z-10 text-center">
                        <div className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-white text-xs font-bold uppercase tracking-widest border border-white/20 inline-block mb-2">
                            {event.type === 'class' ? 'Clase' : 'Evento'}
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white p-2 rounded-full transition-colors backdrop-blur-md">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div className="px-6 pb-8 -mt-6 relative z-10">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col gap-5 text-center">
                        
                        {/* Title & Status */}
                        <div>
                            <h2 className={`text-2xl font-black text-gray-900 leading-tight mb-2 ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                                {event.title}
                            </h2>
                            {isCancelled && (
                                <span className="inline-block px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-black uppercase tracking-wider border border-red-100">
                                    Clase Cancelada
                                </span>
                            )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-left">
                            <div className="bg-gray-50 p-3 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Fecha</p>
                                <p className="font-bold text-gray-900 text-sm">
                                    {format(event.start, 'd MMM, yyyy', { locale: es })}
                                </p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Horario</p>
                                <p className="font-bold text-gray-900 text-sm">
                                    {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                                </p>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3 text-left border border-blue-100">
                            <div className="size-10 bg-white text-blue-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                                <span className="material-symbols-outlined">sports_martial_arts</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-blue-400 uppercase">Instructor</p>
                                <p className="font-bold text-gray-900">{event.instructor || event.instructorName}</p>
                            </div>
                        </div>

                        {event.description && (
                            <div className="text-sm text-gray-500 leading-relaxed bg-gray-50 p-4 rounded-xl text-left border border-gray-100">
                                {event.description}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const StudentSchedule: React.FC = () => {
    const { scheduleEvents } = useAcademy();
    const { currentUser, students, events } = useStore();
    
    // View State
    const [view, setView] = useState<'year' | 'month' | 'week' | 'day' | 'agenda'>('week'); // Default to streamlined week
    const [date, setDate] = useState(new Date());
    
    // Event Selection State
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- FILTERING LOGIC (CORE DATA INTEGRITY) ---
    const student = useMemo(() => students.find(s => s.id === currentUser?.studentId), [students, currentUser]);

    const myEvents = useMemo(() => {
        if (!student) return [];
        return scheduleEvents.filter(evt => {
            // Case A: Recurring Class Instance
            if (evt.type === 'class' && evt.classId) {
                return student.classesId?.includes(evt.classId);
            }
            // Case B: Special Event
            const sourceEvent = events.find(e => e.id === evt.id);
            if (sourceEvent && sourceEvent.registrants?.includes(student.id)) {
                return true;
            }
            return false;
        });
    }, [scheduleEvents, student, events]);

    // --- HANDLERS ---
    
    const handleMonthClick = (newDate: Date) => {
        setDate(newDate);
        setView('day'); // Drill down to simplified Day view
    };

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    // --- CUSTOM NAVIGATOR ---
    const Navigator = () => {
        const handleNavigate = (direction: 'PREV' | 'NEXT' | 'TODAY') => {
            const newDate = new Date(date);
            if (direction === 'TODAY') {
                setDate(new Date());
                return;
            }
            
            const amount = direction === 'NEXT' ? 1 : -1;
            
            if (view === 'year') newDate.setFullYear(newDate.getFullYear() + amount);
            else if (view === 'month') newDate.setMonth(newDate.getMonth() + amount);
            else if (view === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
            else newDate.setDate(newDate.getDate() + amount);
            
            setDate(newDate);
        };

        const title = useMemo(() => {
            if (view === 'year') return format(date, 'yyyy');
            if (view === 'day') return format(date, 'd MMMM yyyy', { locale: es });
            return format(date, 'MMMM yyyy', { locale: es });
        }, [view, date]);

        return (
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => handleNavigate('PREV')} className="size-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary transition-all shadow-sm">
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>
                        <span className="text-2xl font-black text-gray-900 capitalize tracking-tight min-w-[180px] text-center">
                            {title}
                        </span>
                        <button onClick={() => handleNavigate('NEXT')} className="size-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-primary hover:border-primary transition-all shadow-sm">
                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                    </div>
                    <button onClick={() => handleNavigate('TODAY')} className="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-primary transition-colors">
                        Hoy
                    </button>
                </div>

                <div className="flex p-1 bg-gray-100 rounded-2xl shadow-inner">
                    {[
                        { id: 'year', label: 'Anual' },
                        { id: 'month', label: 'Mensual' },
                        { id: 'week', label: 'Semanal' },
                        { id: 'day', label: 'Diario' },
                        { id: 'agenda', label: 'Agenda' },
                    ].map(v => (
                        <button
                            key={v.id}
                            onClick={() => setView(v.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                view === v.id 
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full h-full flex flex-col font-sans">
            <style>{calendarStyles}</style>
            
            <div className="flex flex-col gap-1 mb-8">
                <h1 className="text-3xl font-black tracking-tight text-text-main">Mi Calendario</h1>
                <p className="text-text-secondary">Consulta tus clases inscritas y eventos próximos.</p>
            </div>

            <Navigator />

            <div className="flex-1 bg-white rounded-[2.5rem] p-6 shadow-card border border-gray-200 overflow-hidden relative">
                
                {/* --- YEAR VIEW --- */}
                {view === 'year' && (
                    <YearView 
                        date={date} 
                        events={myEvents} 
                        onNavigate={setDate}
                        onMonthClick={(d) => { setDate(d); setView('month'); }}
                        onDayClick={handleMonthClick} // Go to Day view
                    />
                )}

                {/* --- MONTH VIEW (Standard RBC for UX) --- */}
                {view === 'month' && (
                    <Calendar
                        localizer={localizer}
                        events={myEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%', minHeight: '600px' }}
                        view={Views.MONTH}
                        date={date}
                        onNavigate={() => {}} // Controlled by outer nav
                        toolbar={false} // Hide default toolbar
                        onSelectSlot={(slotInfo) => handleMonthClick(slotInfo.start)} // Click empty space
                        onSelectEvent={(event) => handleEventClick(event)}
                        selectable
                        popup
                        messages={{ showMore: total => `+${total} más` }}
                        eventPropGetter={(event) => ({
                            style: {
                                backgroundColor: event.status === 'cancelled' ? '#FEE2E2' : event.color || '#3b82f6',
                                color: event.status === 'cancelled' ? '#EF4444' : '#fff',
                                textDecoration: event.status === 'cancelled' ? 'line-through' : 'none',
                                opacity: event.status === 'cancelled' ? 0.7 : 1,
                            }
                        })}
                    />
                )}

                {/* --- WEEK VIEW (SIMPLIFIED CUSTOM) --- */}
                {view === 'week' && (
                    <SimplifiedWeekView 
                        date={date} 
                        events={myEvents} 
                        onEventClick={handleEventClick} 
                    />
                )}

                {/* --- DAY VIEW (SIMPLIFIED CUSTOM) --- */}
                {view === 'day' && (
                    <SimplifiedDayView 
                        date={date} 
                        events={myEvents} 
                        onEventClick={handleEventClick} 
                    />
                )}

                {/* --- AGENDA VIEW (Standard RBC) --- */}
                {view === 'agenda' && (
                    <Calendar
                        localizer={localizer}
                        events={myEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%', minHeight: '600px' }}
                        view={Views.AGENDA}
                        date={date}
                        onNavigate={() => {}}
                        toolbar={false}
                        onSelectEvent={handleEventClick}
                        length={30} // 30 days range
                        messages={{
                            date: 'Fecha',
                            time: 'Hora',
                            event: 'Evento',
                            noEventsInRange: 'No hay eventos próximos.'
                        }}
                    />
                )}
            </div>

            <EventDetailModal 
                isOpen={isModalOpen}
                event={selectedEvent}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default StudentSchedule;
