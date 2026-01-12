
import React, { useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAcademy } from '../../context/AcademyContext';
import { CalendarEvent } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';

// Import CSS via JS to ensure styles are present without global file mods
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

// --- CONSTANTS ---
const EVENT_COLORS = [
    { label: 'Azul (Clases)', value: '#3b82f6' },
    { label: 'Morado (Avanzado)', value: '#8b5cf6' },
    { label: 'Verde (Open Mat)', value: '#10b981' },
    { label: 'Naranja (Torneo)', value: '#f97316' },
    { label: 'Rosa (Seminario)', value: '#ec4899' },
    { label: 'Rojo (Cancelado)', value: '#ef4444' }, // Visual helper only
];

// --- COMPONENTS ---

const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
        toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
        toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
        toolbar.onNavigate('TODAY');
    };

    const setView = (view: View) => {
        toolbar.onView(view);
    };

    const label = () => {
        const date = toolbar.date;
        return (
            <span className="capitalize text-xl font-bold text-text-main">
                {format(date, 'MMMM yyyy', { locale: es })}
            </span>
        );
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-4">
                {label()}
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
                    onClick={() => setView(Views.MONTH)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${toolbar.view === 'month' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Mes
                </button>
                <button 
                    onClick={() => setView(Views.WEEK)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${toolbar.view === 'week' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Semana
                </button>
                <button 
                    onClick={() => setView(Views.DAY)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${toolbar.view === 'day' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Día
                </button>
                <button 
                    onClick={() => setView(Views.AGENDA)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${toolbar.view === 'agenda' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Agenda
                </button>
            </div>
        </div>
    );
};

const EventModal: React.FC<{
    isOpen: boolean;
    event: Partial<CalendarEvent> | null;
    onClose: () => void;
    onSave: (evt: Partial<CalendarEvent>) => void;
    onDelete: (id: string) => void;
}> = ({ isOpen, event, onClose, onSave, onDelete }) => {
    if (!isOpen || !event) return null;

    const [formData, setFormData] = useState({
        title: '',
        instructor: '',
        date: '',
        startTime: '',
        endTime: '',
        status: 'active' as 'active' | 'cancelled' | 'rescheduled',
        color: '#3b82f6',
        description: ''
    });

    React.useEffect(() => {
        if (event) {
            const start = event.start ? new Date(event.start) : new Date();
            const end = event.end ? new Date(event.end) : new Date(new Date().setHours(start.getHours() + 1));
            
            // Format for inputs (YYYY-MM-DD and HH:MM)
            const dateStr = format(start, 'yyyy-MM-dd');
            const timeStartStr = format(start, 'HH:mm');
            const timeEndStr = format(end, 'HH:mm');

            setFormData({
                title: event.title || '',
                instructor: event.instructor || event.instructorName || '',
                date: dateStr,
                startTime: timeStartStr,
                endTime: timeEndStr,
                status: event.status || 'active',
                color: event.color || '#3b82f6',
                description: event.description || ''
            });
        }
    }, [event]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Reconstruct Date objects
        const [y, m, d] = formData.date.split('-').map(Number);
        const [sh, sm] = formData.startTime.split(':').map(Number);
        const [eh, em] = formData.endTime.split(':').map(Number);

        const newStart = new Date(y, m - 1, d, sh, sm);
        const newEnd = new Date(y, m - 1, d, eh, em);

        onSave({
            ...event,
            title: formData.title,
            instructor: formData.instructor,
            start: newStart,
            end: newEnd,
            status: formData.status,
            color: formData.color,
            description: formData.description
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${formData.status === 'cancelled' ? 'bg-red-50' : 'bg-gray-50/50'}`}>
                    <div>
                        <h3 className={`text-lg font-bold ${formData.status === 'cancelled' ? 'text-red-700' : 'text-text-main'}`}>
                            {event.id ? 'Editar Evento' : 'Nuevo Evento'}
                        </h3>
                        {formData.status === 'cancelled' && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full uppercase">Cancelado</span>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200/50 rounded-full text-text-secondary transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Título de la Clase</label>
                        <input 
                            required
                            disabled={!!event.classId} // If recurring class instance, disable title editing here
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full rounded-xl border-gray-200 bg-gray-50/50 p-3 text-sm focus:border-primary focus:ring-primary font-semibold disabled:text-gray-500 disabled:bg-gray-100" 
                            placeholder="Ej. Jiu-Jitsu Fundamentals"
                        />
                        {event.classId && <p className="text-[10px] text-gray-400 mt-1">* Título definido en configuración de clase.</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Estado</label>
                            <select 
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value as any})}
                                className={`w-full rounded-xl border-gray-200 p-2.5 text-sm font-bold focus:ring-2 focus:ring-offset-1 ${formData.status === 'active' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}
                            >
                                <option value="active">Activa</option>
                                <option value="cancelled">Cancelada</option>
                                <option value="rescheduled">Reprogramada</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Color</label>
                            <div className="flex gap-1.5 items-center h-[42px] bg-gray-50/50 rounded-xl px-2 border border-gray-200">
                                {EVENT_COLORS.filter(c => c.value !== '#ef4444').map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setFormData({...formData, color: c.value})}
                                        className={`size-6 rounded-full transition-all ${formData.color === c.value ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : 'hover:scale-110'}`}
                                        style={{ backgroundColor: c.value }}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-3">
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Fecha</label>
                            <input 
                                type="date"
                                required
                                value={formData.date} 
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className="w-full rounded-xl border-gray-200 p-2.5 text-sm focus:border-primary focus:ring-primary" 
                            />
                        </div>
                        <div className="col-span-1.5">
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Inicio</label>
                            <input 
                                type="time"
                                required
                                value={formData.startTime} 
                                onChange={e => setFormData({...formData, startTime: e.target.value})}
                                className="w-full rounded-xl border-gray-200 p-2.5 text-sm focus:border-primary focus:ring-primary" 
                            />
                        </div>
                        <div className="col-span-1.5">
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Fin</label>
                            <input 
                                type="time"
                                required
                                value={formData.endTime} 
                                onChange={e => setFormData({...formData, endTime: e.target.value})}
                                className="w-full rounded-xl border-gray-200 p-2.5 text-sm focus:border-primary focus:ring-primary" 
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase mb-1.5">Instructor</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 material-symbols-outlined text-[20px]">person</span>
                            <input 
                                value={formData.instructor} 
                                onChange={e => setFormData({...formData, instructor: e.target.value})}
                                className="w-full rounded-xl border-gray-200 pl-10 p-2.5 text-sm focus:border-primary focus:ring-primary" 
                                placeholder="Nombre del Instructor"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-auto">
                        {event.id && (
                            <button 
                                type="button" 
                                onClick={() => onDelete(event.id!)}
                                className="p-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                                title="Eliminar / Cancelar"
                            >
                                <span className="material-symbols-outlined">delete</span>
                            </button>
                        )}
                        <button type="submit" className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black shadow-lg active:scale-95 transition-all">
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ScheduleManager: React.FC = () => {
    const { scheduleEvents, updateCalendarEvent, addCalendarEvent, deleteCalendarEvent } = useAcademy();
    const { addToast } = useToast();
    const { confirm } = useConfirmation();

    // State
    const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent> | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const handleSelectSlot = useCallback(
        ({ start, end }: { start: Date; end: Date }) => {
            setSelectedEvent({
                start,
                end,
                title: '',
                instructor: '',
                status: 'active',
                color: '#3b82f6'
            });
            setIsModalOpen(true);
        },
        []
    );

    const handleSelectEvent = useCallback(
        (event: CalendarEvent) => {
            setSelectedEvent(event);
            setIsModalOpen(true);
        },
        []
    );

    const handleSaveEvent = (evt: Partial<CalendarEvent>) => {
        if (evt.id) {
            updateCalendarEvent(evt.id, evt);
            addToast('Calendario actualizado', 'success');
        } else {
            addCalendarEvent({
                ...evt,
                id: '', // Context generates ID
                academyId: '', // Context assigns Academy
                type: 'class'
            } as CalendarEvent);
            addToast('Evento creado', 'success');
        }
        setIsModalOpen(false);
    };

    const handleDeleteEvent = (id: string) => {
        confirm({
            title: 'Eliminar/Cancelar Evento',
            message: '¿Estás seguro? Si es una clase recurrente, se cancelará solo esta sesión.',
            type: 'danger',
            confirmText: 'Proceder',
            onConfirm: () => {
                deleteCalendarEvent(id);
                setIsModalOpen(false);
                addToast('Evento actualizado', 'info');
            }
        });
    };

    return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full h-full flex flex-col font-sans">
            <style>{calendarStyles}</style>
            
            <div className="flex justify-between items-end mb-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-text-main">Gestor de Calendario</h1>
                    <p className="text-text-secondary mt-1">Programa clases, torneos y eventos especiales.</p>
                </div>
                <button 
                    onClick={() => {
                        const now = new Date();
                        const end = new Date(now.getTime() + 60*60*1000);
                        handleSelectSlot({ start: now, end });
                    }}
                    className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 flex items-center gap-2 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">add</span>
                    Nuevo Evento
                </button>
            </div>

            <div className="flex-1 bg-white rounded-3xl p-6 shadow-card border border-gray-200">
                <Calendar
                    localizer={localizer}
                    events={scheduleEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: '100%', minHeight: '600px' }}
                    views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                    defaultView={Views.WEEK}
                    selectable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    eventPropGetter={eventPropGetter}
                    components={{
                        toolbar: CustomToolbar
                    }}
                    messages={{
                        noEventsInRange: 'No hay eventos en este rango.',
                        allDay: 'Todo el día',
                    }}
                    culture='es'
                />
            </div>

            <EventModal 
                isOpen={isModalOpen}
                event={selectedEvent}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
            />
        </div>
    );
};

export default ScheduleManager;
