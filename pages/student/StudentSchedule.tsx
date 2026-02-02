
import React, { useState, useMemo } from 'react';
import { 
    format, startOfWeek, addDays, isSameDay, 
    startOfMonth, endOfMonth, eachDayOfInterval, endOfWeek, isSameMonth,
    addMonths, addWeeks, isAfter, isBefore
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useAcademy } from '../../context/AcademyContext';
import { useStore } from '../../context/StoreContext';
import { CalendarEvent } from '../../types';
import YearView from '../../components/calendar/YearView';
import { AnimatePresence, motion } from 'framer-motion';

// --- TYPES ---
type ViewType = 'year' | 'month' | 'week' | 'day' | 'agenda';

// --- COMPONENT: INFINITE MONTH GRID (Google Style) - KEPT INTACT ---
const InfiniteMonthGrid: React.FC<{ 
    date: Date; 
    events: CalendarEvent[]; 
    onDayClick: (d: Date, events: CalendarEvent[]) => void;
}> = ({ date, events, onDayClick }) => {
    
    const days = useMemo(() => {
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [date]);

    const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
        <div className="flex flex-col h-full animate-in fade-in duration-500 overflow-hidden">
            {/* Headers */}
            <div className="grid grid-cols-7 mb-2 px-4 pt-4 shrink-0">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="grid grid-cols-7 auto-rows-fr gap-1 h-full min-h-[600px]">
                    {days.map((day) => {
                        const dayEvents = events
                            .filter(e => isSameDay(e.start, day))
                            .sort((a, b) => a.start.getTime() - b.start.getTime());
                        
                        const isToday = isSameDay(day, new Date());
                        const isCurrentMonth = isSameMonth(day, date);

                        return (
                            <div 
                                key={day.toISOString()} 
                                onClick={() => onDayClick(day, dayEvents)}
                                className={`
                                    min-h-[100px] p-2 rounded-lg transition-all cursor-pointer group flex flex-col items-center
                                    ${isCurrentMonth ? 'hover:bg-gray-50' : 'bg-gray-50/20 opacity-40'}
                                `}
                            >
                                {/* Day Number */}
                                <div className={`
                                    size-7 flex items-center justify-center rounded-full text-xs font-bold transition-all mb-1
                                    ${isToday 
                                        ? 'bg-red-600 text-white' 
                                        : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}
                                `}>
                                    {format(day, 'd')}
                                </div>

                                {/* Events List (Pills) */}
                                <div className="w-full flex flex-col gap-1 overflow-hidden">
                                    {dayEvents.slice(0, 3).map(evt => (
                                        <div 
                                            key={evt.id}
                                            className={`
                                                w-full px-1.5 py-0.5 rounded text-[9px] font-bold truncate transition-transform hover:scale-[1.02] text-center
                                                ${evt.status === 'cancelled' 
                                                    ? 'bg-gray-100 text-gray-400 line-through' 
                                                    : 'bg-red-50 text-red-700'}
                                            `}
                                        >
                                            {evt.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="text-[9px] font-bold text-gray-400 text-center">
                                            + {dayEvents.length - 3} más
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: CLEAN WEEK VIEW (No Time Grid) ---
const CleanWeekView: React.FC<{
    date: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}> = ({ date, events, onEventClick }) => {
    
    const weekDays = useMemo(() => {
        const start = startOfWeek(date, { weekStartsOn: 1 }); // Lunes
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
            days.push(addDays(start, i));
        }
        return days;
    }, [date]);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 md:gap-0 h-full">
                {weekDays.map((day, index) => {
                    const dayEvents = events
                        .filter(e => isSameDay(e.start, day))
                        .sort((a, b) => a.start.getTime() - b.start.getTime());
                    
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div key={day.toISOString()} className={`flex flex-col gap-3 md:border-r border-gray-100 last:border-0 md:px-2 min-h-[150px] ${isToday ? 'bg-red-50/10 rounded-xl' : ''}`}>
                            {/* Header Day */}
                            <div className={`text-center py-2 border-b-2 ${isToday ? 'border-red-500' : 'border-transparent'}`}>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{format(day, 'EEE', { locale: es })}</p>
                                <p className={`text-xl font-black ${isToday ? 'text-red-600' : 'text-gray-900'}`}>{format(day, 'd')}</p>
                            </div>

                            {/* Events Stack */}
                            <div className="flex flex-col gap-2">
                                {dayEvents.length > 0 ? (
                                    dayEvents.map(evt => (
                                        <div 
                                            key={evt.id}
                                            onClick={() => onEventClick(evt)}
                                            className={`
                                                p-3 rounded-xl border-l-4 cursor-pointer transition-all hover:shadow-md group
                                                ${evt.status === 'cancelled' 
                                                    ? 'bg-gray-50 border-gray-300 opacity-60' 
                                                    : 'bg-white border-red-500 shadow-sm'}
                                            `}
                                        >
                                            <p className={`text-xs font-bold ${evt.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                {evt.title}
                                            </p>
                                            <p className="text-[10px] text-gray-500 font-medium mt-1">
                                                {format(evt.start, 'HH:mm')}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="hidden md:flex flex-col items-center justify-center h-20 opacity-20">
                                        <span className="material-symbols-outlined text-gray-400">remove</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- COMPONENT: CLEAN DAY VIEW (Focus List) ---
const CleanDayView: React.FC<{
    date: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}> = ({ date, events, onEventClick }) => {
    
    const dayEvents = useMemo(() => {
        return events
            .filter(e => isSameDay(e.start, date))
            .sort((a, b) => a.start.getTime() - b.start.getTime());
    }, [date, events]);

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-3xl mx-auto w-full animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-gray-900 mb-6 capitalize border-l-4 border-red-600 pl-4">
                {format(date, 'EEEE d, MMMM', { locale: es })}
            </h3>

            {dayEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <div className="size-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-4xl opacity-30">self_improvement</span>
                    </div>
                    <p className="text-lg font-medium">Día libre de entrenamiento</p>
                    <p className="text-sm opacity-60">Aprovecha para descansar o estudiar teoría.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {dayEvents.map(evt => (
                        <div 
                            key={evt.id}
                            onClick={() => onEventClick(evt)}
                            className={`
                                flex items-center gap-6 p-6 rounded-2xl border transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1
                                ${evt.status === 'cancelled' 
                                    ? 'bg-gray-50 border-gray-200 opacity-60 grayscale' 
                                    : 'bg-white border-gray-100'}
                            `}
                        >
                            <div className="flex flex-col items-center min-w-[60px]">
                                <span className="text-lg font-black text-gray-900">{format(evt.start, 'HH:mm')}</span>
                                <span className="text-xs font-bold text-gray-400">{format(evt.end, 'HH:mm')}</span>
                            </div>
                            
                            <div className="h-10 w-1 bg-red-100 rounded-full"></div>

                            <div className="flex-1">
                                <h4 className={`text-xl font-bold ${evt.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                    {evt.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-gray-500 font-medium flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">person</span>
                                        {evt.instructor}
                                    </span>
                                    {evt.status === 'cancelled' && (
                                        <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Cancelada</span>
                                    )}
                                </div>
                            </div>

                            <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                                <span className="material-symbols-outlined">chevron_right</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- COMPONENT: AGENDA VIEW (Timeline List) ---
const AgendaView: React.FC<{
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
}> = ({ events, onEventClick }) => {
    
    const agendaItems = useMemo<CalendarEvent[]>(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        return events
            .filter(e => isAfter(e.start, today) || isSameDay(e.start, today))
            .sort((a, b) => a.start.getTime() - b.start.getTime());
    }, [events]);

    const grouped = useMemo<Record<string, CalendarEvent[]>>(() => {
        const groups: Record<string, CalendarEvent[]> = {};
        agendaItems.forEach(evt => {
            const key = format(evt.start, 'yyyy-MM-dd');
            if (!groups[key]) groups[key] = [];
            groups[key].push(evt);
        });
        return groups;
    }, [agendaItems]);

    return (
        <div className="flex-1 overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold text-gray-400 mb-8 uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined">upcoming</span>
                Próximos Eventos
            </h3>

            {Object.keys(grouped).length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium">No tienes eventos próximos en tu agenda.</p>
                </div>
            ) : (
                <div className="relative border-l-2 border-gray-100 ml-4 space-y-12 pb-20">
                    {Object.entries(grouped).map(([dateStr, items]: [string, CalendarEvent[]]) => {
                        const dateObj = new Date(dateStr + 'T00:00:00');
                        const isToday = isSameDay(dateObj, new Date());

                        return (
                            <div key={dateStr} className="relative pl-8">
                                {/* Date Bubble */}
                                <div className={`absolute -left-[9px] top-0 size-4 rounded-full border-4 border-white shadow-sm ${isToday ? 'bg-red-600' : 'bg-gray-300'}`}></div>
                                
                                <h4 className={`text-lg font-bold mb-4 capitalize ${isToday ? 'text-red-600' : 'text-gray-800'}`}>
                                    {isToday ? 'Hoy, ' : ''}{format(dateObj, 'EEEE d MMMM', { locale: es })}
                                </h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {items.map(evt => (
                                        <div 
                                            key={evt.id}
                                            onClick={() => onEventClick(evt)}
                                            className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all cursor-pointer group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide bg-gray-50 px-2 py-1 rounded">
                                                    {format(evt.start, 'HH:mm')}
                                                </span>
                                                {evt.type === 'exam' && <span className="material-symbols-outlined text-yellow-500 text-sm">stars</span>}
                                            </div>
                                            <h5 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-red-700 transition-colors">
                                                {evt.title}
                                            </h5>
                                            <p className="text-sm text-gray-500">{evt.instructor}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// --- COMPONENT: DAY AGENDA DRAWER (Slide Panel) ---
const DayAgendaDrawer: React.FC<{
    isOpen: boolean;
    date: Date | null;
    events: CalendarEvent[];
    onClose: () => void;
    onEventClick: (e: CalendarEvent) => void;
}> = ({ isOpen, date, events, onClose, onEventClick }) => {
    return (
        <AnimatePresence>
            {isOpen && date && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-[50]"
                    />
                    
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-white shadow-2xl border-l border-gray-100 flex flex-col"
                    >
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-white">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight capitalize">
                                    {format(date, 'EEEE', { locale: es })}
                                </h2>
                                <p className="text-gray-500 font-medium text-lg capitalize">
                                    {format(date, 'd MMMM yyyy', { locale: es })}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 bg-white">
                            {events.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                                    <span className="material-symbols-outlined text-6xl opacity-20 mb-4">event_busy</span>
                                    <p className="font-medium">No hay actividades programadas.</p>
                                </div>
                            ) : (
                                <div className="space-y-6 relative">
                                    <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-gray-100"></div>
                                    {events.map((evt) => (
                                        <div 
                                            key={evt.id} 
                                            onClick={() => onEventClick(evt)}
                                            className="relative pl-10 group cursor-pointer"
                                        >
                                            <div className={`absolute left-2 top-2 size-6 rounded-full border-4 border-white shadow-sm z-10 box-content ${evt.status === 'cancelled' ? 'bg-gray-300' : 'bg-red-600'}`}></div>
                                            <div className={`p-5 rounded-2xl border transition-all ${evt.status === 'cancelled' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-red-100 hover:shadow-lg hover:shadow-red-500/5'}`}>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-xs font-bold uppercase tracking-wider ${evt.status === 'cancelled' ? 'text-gray-400' : 'text-red-600'}`}>
                                                        {format(evt.start, 'HH:mm')} - {format(evt.end, 'HH:mm')}
                                                    </span>
                                                </div>
                                                <h3 className={`font-bold text-lg leading-tight mb-1 ${evt.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                    {evt.title}
                                                </h3>
                                                <p className="text-sm text-gray-500">{evt.instructor}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-white/60 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200" onClick={onClose}>
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative border border-gray-100" onClick={e => e.stopPropagation()}>
                
                <div className={`h-32 ${isCancelled ? 'bg-red-500' : 'bg-gray-900'} relative overflow-hidden flex items-center justify-center`}>
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute -top-10 -right-10 size-40 bg-white rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 size-32 bg-white rounded-full blur-3xl"></div>
                    </div>
                    <div className="relative z-10 text-center flex flex-col items-center">
                        <span className="material-symbols-outlined text-4xl text-white mb-2">
                            {event.type === 'class' ? 'sports_martial_arts' : event.type === 'exam' ? 'workspace_premium' : 'emoji_events'}
                        </span>
                        <div className="bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-widest border border-white/20">
                            {event.type === 'class' ? 'Clase' : 'Evento'}
                        </div>
                    </div>
                    <button onClick={onClose} className="absolute top-5 right-5 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-md active:scale-95">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div className="px-8 pb-10 -mt-6 relative z-10">
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-50 flex flex-col gap-6 text-center">
                        <div>
                            <h2 className={`text-2xl font-black text-gray-900 leading-tight mb-2 ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                                {event.title}
                            </h2>
                            {isCancelled && (
                                <span className="inline-block px-3 py-1 rounded-lg bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-wider border border-red-100">
                                    Clase Cancelada
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                <span className="text-xs font-bold text-gray-400 uppercase">Fecha</span>
                                <span className="font-bold text-gray-900 text-sm capitalize">{format(event.start, 'd MMMM, yyyy', { locale: es })}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                <span className="text-xs font-bold text-gray-400 uppercase">Horario</span>
                                <span className="font-bold text-gray-900 text-sm">{format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                <span className="text-xs font-bold text-gray-400 uppercase">Instructor</span>
                                <span className="font-bold text-gray-900 text-sm">{event.instructor || event.instructorName}</span>
                            </div>
                        </div>
                        {event.description && (
                            <div className="text-sm text-gray-500 leading-relaxed text-left border-t border-gray-100 pt-4">
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
    
    const [view, setView] = useState<ViewType>('agenda'); // Default to Agenda as requested "Simple overview"
    const [date, setDate] = useState(new Date());
    
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    
    const [drawerState, setDrawerState] = useState<{ isOpen: boolean; date: Date | null; events: CalendarEvent[] }>({
        isOpen: false,
        date: null,
        events: []
    });

    const student = useMemo(() => students.find(s => s.id === currentUser?.studentId), [students, currentUser]);

    const myEvents: CalendarEvent[] = useMemo(() => {
        if (!student) return [];
        return scheduleEvents.filter(evt => {
            if (evt.type === 'class' && evt.classId) {
                return student.classesId?.includes(evt.classId);
            }
            const sourceEvent = events.find(e => e.id === evt.id);
            if (sourceEvent && sourceEvent.registrants?.includes(student.id)) {
                return true;
            }
            return false;
        });
    }, [scheduleEvents, student, events]);

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsEventModalOpen(true);
    };

    const handleDayClick = (d: Date, dayEvents: CalendarEvent[]) => {
        setDrawerState({ isOpen: true, date: d, events: dayEvents });
    };

    const handleNavigate = (direction: 'PREV' | 'NEXT' | 'TODAY') => {
        const now = new Date();
        if (direction === 'TODAY') {
            setDate(now);
            return;
        }
        const amount = direction === 'NEXT' ? 1 : -1;
        switch (view) {
            case 'year': setDate(prev => new Date(prev.getFullYear() + amount, prev.getMonth(), 1)); break;
            case 'month': setDate(prev => addMonths(prev, amount)); break;
            case 'week': setDate(prev => addWeeks(prev, amount)); break;
            case 'day': setDate(prev => addDays(prev, amount)); break;
            case 'agenda': break; // Agenda is infinite/list
        }
    };

    const headerTitle = useMemo(() => {
        switch (view) {
            case 'year': return format(date, 'yyyy');
            case 'month': return format(date, 'MMMM yyyy', { locale: es });
            case 'week': {
                const start = startOfWeek(date, { weekStartsOn: 1 });
                const end = endOfWeek(date, { weekStartsOn: 1 });
                if (isSameMonth(start, end)) return `${format(start, 'd')} - ${format(end, 'd')} ${format(start, 'MMMM', { locale: es })}`;
                return `${format(start, 'd MMM')} - ${format(end, 'd MMM', { locale: es })}`;
            }
            case 'day': return format(date, 'd MMMM', { locale: es });
            case 'agenda': return 'Mi Agenda';
            default: return '';
        }
    }, [view, date]);

    return (
        <div className="w-full h-full bg-white flex flex-col font-sans overflow-hidden">
            
            {/* --- IMMERSIVE HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-center px-6 py-4 border-b border-gray-100 bg-white shrink-0 gap-4">
                <div className="flex items-center gap-6 w-full md:w-auto">
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 capitalize min-w-[200px]">
                        {headerTitle}
                    </h1>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end overflow-x-auto no-scrollbar">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {[
                            { id: 'agenda', label: 'Agenda' },
                            { id: 'year', label: 'Año' },
                            { id: 'month', label: 'Mes' },
                            { id: 'week', label: 'Semana' },
                            { id: 'day', label: 'Día' },
                        ].map(v => (
                            <button
                                key={v.id}
                                onClick={() => setView(v.id as ViewType)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                    view === v.id 
                                    ? 'bg-white text-gray-900 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                                }`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>

                    {view !== 'agenda' && (
                        <div className="flex items-center gap-1">
                            <button onClick={() => handleNavigate('PREV')} className="size-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all">
                                <span className="material-symbols-outlined text-xl">chevron_left</span>
                            </button>
                            <button onClick={() => handleNavigate('TODAY')} className="px-3 py-1.5 rounded-lg hover:bg-gray-100 text-xs font-bold text-gray-900 uppercase transition-all">
                                Hoy
                            </button>
                            <button onClick={() => handleNavigate('NEXT')} className="size-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all">
                                <span className="material-symbols-outlined text-xl">chevron_right</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MAIN CANVAS CONTENT --- */}
            <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
                
                {/* 1. VIEW: AGENDA (NEW) */}
                {view === 'agenda' && (
                    <AgendaView events={myEvents} onEventClick={handleEventClick} />
                )}

                {/* 2. VIEW: WEEK (NEW CLEAN) */}
                {view === 'week' && (
                    <CleanWeekView date={date} events={myEvents} onEventClick={handleEventClick} />
                )}

                {/* 3. VIEW: DAY (NEW CLEAN) */}
                {view === 'day' && (
                    <CleanDayView date={date} events={myEvents} onEventClick={handleEventClick} />
                )}

                {/* 4. VIEW: MONTH (EXISTING) */}
                {view === 'month' && (
                    <InfiniteMonthGrid 
                        date={date} 
                        events={myEvents} 
                        onDayClick={handleDayClick}
                    />
                )}

                {/* 5. VIEW: YEAR (EXISTING) */}
                {view === 'year' && (
                    <div className="h-full overflow-y-auto p-6">
                        <YearView 
                            date={date} 
                            events={myEvents} 
                            onNavigate={setDate}
                            onMonthClick={(d) => { setDate(d); setView('month'); }}
                            onDayClick={(d) => { 
                                const dayEvents = myEvents.filter(e => isSameDay(e.start, d));
                                handleDayClick(d, dayEvents);
                            }}
                        />
                    </div>
                )}
            </div>

            <DayAgendaDrawer 
                isOpen={drawerState.isOpen}
                date={drawerState.date}
                events={drawerState.events}
                onClose={() => setDrawerState(prev => ({ ...prev, isOpen: false }))}
                onEventClick={(evt) => {
                    setDrawerState(prev => ({ ...prev, isOpen: false })); 
                    handleEventClick(evt); 
                }}
            />

            <EventDetailModal 
                isOpen={isEventModalOpen}
                event={selectedEvent}
                onClose={() => setIsEventModalOpen(false)}
            />
        </div>
    );
};

export default StudentSchedule;
