
import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAcademy } from '../../context/AcademyContext';
import { useStore } from '../../context/StoreContext';
import { CalendarEvent } from '../../types';
import YearView from '../../components/calendar/YearView'; // Import YearView

// Reuse CSS styles for consistency
const calendarStyles = `
@import url('https://cdn.jsdelivr.net/npm/react-big-calendar@1.8.5/lib/css/react-big-calendar.css');

.rbc-calendar { font-family: 'Inter', sans-serif; border: none; }
.rbc-header { padding: 12px 0; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #9CA3AF; border-bottom: 1px solid #F3F4F6; }
.rbc-month-view { border: 1px solid #F3F4F6; border-radius: 24px; overflow: hidden; background: white; }
.rbc-day-bg + .rbc-day-bg { border-left: 1px solid #F3F4F6; }
.rbc-month-row + .rbc-month-row { border-top: 1px solid #F3F4F6; }
.rbc-off-range-bg { background: #FAFAFA; }
.rbc-today { background: #EFF6FF; }
.rbc-time-view { border: 1px solid #F3F4F6; border-radius: 24px; overflow: hidden; background: white; }
.rbc-time-header-content { border-left: 1px solid #F3F4F6; }
.rbc-time-content { border-top: 1px solid #F3F4F6; }
.rbc-timeslot-group { border-bottom: 1px solid #F3F4F6; }
.rbc-day-slot { border-left: 1px solid #F3F4F6; }
.rbc-current-time-indicator { background-color: #EF4444; height: 2px; }
.rbc-event { border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: none; padding: 2px 5px; }
.rbc-toolbar { margin-bottom: 20px; }
`;

// --- SETUP LOCALIZER ---
const locales = {
  'es': es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// --- SUB-COMPONENTS ---

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
                <div className={`h-24 ${isCancelled ? 'bg-red-500' : 'bg-primary'} relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-20">
                        <span className="material-symbols-outlined text-[150px] -top-10 -right-10 absolute rotate-12">calendar_month</span>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white p-2 rounded-full transition-colors backdrop-blur-md">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="px-8 pb-8 -mt-10 relative z-10">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex flex-col gap-4">
                        
                        {/* Title & Status */}
                        <div>
                            {isCancelled && (
                                <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider mb-2">
                                    Cancelada
                                </span>
                            )}
                            {event.status === 'rescheduled' && (
                                <span className="inline-block px-2 py-1 rounded bg-orange-100 text-orange-700 text-[10px] font-black uppercase tracking-wider mb-2">
                                    Reprogramada
                                </span>
                            )}
                            <h2 className={`text-2xl font-black text-text-main leading-tight ${isCancelled ? 'line-through text-gray-400' : ''}`}>
                                {event.title}
                            </h2>
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-text-secondary shrink-0">
                                    <span className="material-symbols-outlined">schedule</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-text-secondary uppercase">Horario</p>
                                    <p className="font-semibold text-text-main">
                                        {format(event.start, 'EEEE d, MMMM', { locale: es })}
                                    </p>
                                    <p className="text-sm text-text-main">
                                        {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-text-secondary shrink-0">
                                    <span className="material-symbols-outlined">person</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-text-secondary uppercase">Instructor</p>
                                    <p className="font-semibold text-text-main">{event.instructor || event.instructorName}</p>
                                </div>
                            </div>

                            {event.description && (
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-sm text-text-secondary leading-relaxed">{event.description}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentSchedule: React.FC = () => {
    const { scheduleEvents } = useAcademy();
    const { currentUser, students, events } = useStore();
    
    // View State (Added 'year')
    const [view, setView] = useState<View | 'year'>('month');
    const [date, setDate] = useState(new Date());
    
    // Event Selection State
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- FILTERING LOGIC ---
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

    // --- INTERACTION HANDLERS ---
    
    // Drill down: Year Month -> Month View
    const handleMonthClick = (newDate: Date) => {
        setDate(newDate);
        setView(Views.MONTH);
    };

    // Drill down: Year Day -> Day View (Agenda)
    const handleDayClick = (newDate: Date) => {
        setDate(newDate);
        setView(Views.DAY); // Or AGENDA if preferred
    };

    // --- CUSTOM TOOLBAR COMPONENT ---
    const CustomToolbar = (toolbar: any) => {
        const goToBack = () => {
            if (view === 'year') {
                const newDate = new Date(date.getFullYear() - 1, 0, 1);
                setDate(newDate);
                toolbar.onNavigate('PREV', newDate);
            } else {
                toolbar.onNavigate('PREV');
            }
        };

        const goToNext = () => {
            if (view === 'year') {
                const newDate = new Date(date.getFullYear() + 1, 0, 1);
                setDate(newDate);
                toolbar.onNavigate('NEXT', newDate);
            } else {
                toolbar.onNavigate('NEXT');
            }
        };

        const goToCurrent = () => {
            const now = new Date();
            setDate(now);
            toolbar.onNavigate('TODAY', now);
        };

        const handleViewChange = (newView: View | 'year') => {
            setView(newView);
            if (newView !== 'year') {
                toolbar.onView(newView);
            }
        };

        return (
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <span className="capitalize text-xl font-bold text-text-main">
                        {view === 'year' 
                            ? format(date, 'yyyy') 
                            : format(toolbar.date, 'MMMM yyyy', { locale: es })}
                    </span>
                    <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                        <button onClick={goToBack} className="p-1.5 hover:bg-gray-100 rounded-lg text-text-secondary transition-colors">
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button onClick={goToCurrent} className="px-3 text-xs font-bold text-text-main hover:bg-gray-50 rounded-md transition-colors">
                            Hoy
                        </button>
                        <button onClick={goToNext} className="p-1.5 hover:bg-gray-100 rounded-lg text-text-secondary transition-colors">
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
                    <button 
                        onClick={() => handleViewChange('year')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'year' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Anual
                    </button>
                    <button 
                        onClick={() => handleViewChange(Views.MONTH)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'month' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Mes
                    </button>
                    <button 
                        onClick={() => handleViewChange(Views.WEEK)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'week' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Semana
                    </button>
                    <button 
                        onClick={() => handleViewChange(Views.DAY)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'day' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Día
                    </button>
                    <button 
                        onClick={() => handleViewChange(Views.AGENDA)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${view === 'agenda' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Agenda
                    </button>
                </div>
            </div>
        );
    };

    // --- EVENT STYLING ---
    const eventPropGetter = useCallback(
        (event: CalendarEvent) => {
            const isCancelled = event.status === 'cancelled';
            const backgroundColor = isCancelled ? '#fee2e2' : (event.color || '#3b82f6');
            const color = isCancelled ? '#991b1b' : '#ffffff';
            
            return {
                style: {
                    backgroundColor,
                    color,
                    textDecoration: isCancelled ? 'line-through' : 'none',
                    opacity: isCancelled ? 0.7 : 1,
                    borderLeft: isCancelled ? '4px solid #ef4444' : `4px solid rgba(0,0,0,0.1)`,
                    fontSize: '12px',
                    fontWeight: '600'
                },
            };
        },
        []
    );

    // --- HANDLERS ---
    const handleSelectEvent = useCallback(
        (event: CalendarEvent) => {
            setSelectedEvent(event);
            setIsModalOpen(true);
        },
        []
    );

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full h-full flex flex-col font-sans">
            <style>{calendarStyles}</style>
            
            <div className="flex flex-col gap-1 mb-6">
                <h1 className="text-3xl font-black tracking-tight text-text-main">Calendario de Clases</h1>
                <p className="text-text-secondary">Consulta los horarios oficiales y cambios en tiempo real.</p>
            </div>

            <div className="flex-1">
                {view === 'year' ? (
                    <div className="h-full">
                        {/* Fake Toolbar for Year View to maintain consistency */}
                        <CustomToolbar 
                            date={date} 
                            onNavigate={(action: any, newDate: Date) => setDate(newDate)} 
                            onView={() => {}} 
                            view={view} 
                        />
                        <YearView 
                            date={date} 
                            events={myEvents} 
                            onNavigate={setDate}
                            onMonthClick={handleMonthClick}
                            onDayClick={handleDayClick}
                        />
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl p-6 shadow-card border border-gray-200 h-full min-h-[600px]">
                        <Calendar
                            localizer={localizer}
                            events={myEvents}
                            startAccessor="start"
                            endAccessor="end"
                            style={{ height: '100%' }}
                            view={view as View}
                            onView={(v) => setView(v)}
                            date={date}
                            onNavigate={(d) => setDate(d)}
                            selectable={false} // READ ONLY
                            onSelectEvent={handleSelectEvent}
                            eventPropGetter={eventPropGetter}
                            components={{
                                toolbar: CustomToolbar
                            }}
                            messages={{
                                noEventsInRange: 'No hay clases en este rango.',
                                allDay: 'Todo el día',
                            }}
                            culture='es'
                        />
                    </div>
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
