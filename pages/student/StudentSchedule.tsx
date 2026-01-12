
import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAcademy } from '../../context/AcademyContext';
import { useStore } from '../../context/StoreContext';
import { CalendarEvent } from '../../types';

const locales = { 'es': es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const CustomToolbar = (toolbar: any) => {
    const goToBack = () => toolbar.onNavigate('PREV');
    const goToNext = () => toolbar.onNavigate('NEXT');
    const goToCurrent = () => toolbar.onNavigate('TODAY');
    const setView = (view: View) => toolbar.onView(view);

    return (
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-[#1c1c1e] p-4 rounded-2xl border border-zinc-800 shadow-lg">
            <div className="flex items-center gap-4">
                <span className="capitalize text-lg font-bold text-white font-sans tracking-tight">
                    {format(toolbar.date, 'MMMM yyyy', { locale: es })}
                </span>
                <div className="flex bg-[#09090b] rounded-xl border border-zinc-800 p-0.5">
                    <button onClick={goToBack} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors rounded-lg">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button onClick={goToCurrent} className="px-4 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors rounded-lg uppercase tracking-wider">
                        Hoy
                    </button>
                    <button onClick={goToNext} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors rounded-lg">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>
            </div>
            <div className="flex bg-[#09090b] p-1 rounded-xl border border-zinc-800">
                <button onClick={() => setView(Views.MONTH)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${toolbar.view === 'month' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Mes</button>
                <button onClick={() => setView(Views.WEEK)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${toolbar.view === 'week' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Semana</button>
                <button onClick={() => setView(Views.AGENDA)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider ${toolbar.view === 'agenda' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Agenda</button>
            </div>
        </div>
    );
};

const StudentSchedule: React.FC = () => {
    const { scheduleEvents } = useAcademy();
    const { currentUser, students, events } = useStore();
    const [view, setView] = useState<View>('month');
    const [date, setDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

    const student = useMemo(() => students.find(s => s.id === currentUser?.studentId), [students, currentUser]);

    const myEvents = useMemo(() => {
        if (!student) return [];
        return scheduleEvents.filter(evt => {
            if (evt.type === 'class' && evt.classId) return student.classesId?.includes(evt.classId);
            const sourceEvent = events.find(e => e.id === evt.id);
            return sourceEvent && sourceEvent.registrants?.includes(student.id);
        });
    }, [scheduleEvents, student, events]);

    const eventPropGetter = useCallback((event: CalendarEvent) => {
        const isCancelled = event.status === 'cancelled';
        return {
            style: {
                backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.1)' : 'rgba(10, 132, 255, 0.15)',
                color: isCancelled ? '#fca5a5' : '#fff',
                border: isCancelled ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(10, 132, 255, 0.3)',
                fontSize: '10px',
                fontWeight: '600',
                opacity: isCancelled ? 0.6 : 1,
            },
        };
    }, []);

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full h-full flex flex-col font-sans text-zinc-200">
            <div className="flex flex-col gap-1 mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-white font-sans">Mi Calendario</h1>
                <p className="text-zinc-500 text-sm font-medium">Clases y eventos inscritos.</p>
            </div>

            <div className="flex-1 bg-[#09090b] rounded-3xl p-1 overflow-hidden h-[600px] border border-zinc-800">
                <Calendar
                    localizer={localizer}
                    events={myEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%' }}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    selectable={false}
                    onSelectEvent={(evt) => setSelectedEvent(evt)}
                    eventPropGetter={eventPropGetter}
                    components={{ toolbar: CustomToolbar }}
                    culture='es'
                />
            </div>

            {/* Read-Only Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-[#1c1c1e] w-full max-w-sm rounded-3xl border border-zinc-800 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-2">{selectedEvent.title}</h3>
                        <p className="text-zinc-400 text-sm mb-4 leading-relaxed">{selectedEvent.description || 'Sin descripción.'}</p>
                        <div className="flex justify-between items-center text-xs font-mono text-zinc-500 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                            <span className="text-white font-bold">{format(selectedEvent.start, 'HH:mm')} - {format(selectedEvent.end, 'HH:mm')}</span>
                            <span className="uppercase text-[10px] tracking-wider">{selectedEvent.instructor}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentSchedule;
