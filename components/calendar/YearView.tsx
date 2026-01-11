
import React, { useMemo } from 'react';
import { format, startOfYear, addMonths, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarEvent } from '../../types';

interface YearViewProps {
    date: Date;
    events: CalendarEvent[];
    onNavigate: (date: Date) => void;
    onMonthClick: (date: Date) => void;
    onDayClick: (date: Date) => void;
}

const YearView: React.FC<YearViewProps> = ({ date, events, onNavigate, onMonthClick, onDayClick }) => {
    const yearStart = startOfYear(date);
    const months = Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));

    return (
        <div className="flex flex-col h-full bg-white rounded-3xl p-6 shadow-card border border-gray-200 overflow-y-auto animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-20 py-2">
                <h2 className="text-4xl font-black text-text-main tracking-tight">{format(date, 'yyyy')}</h2>
                <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                    <button 
                        onClick={() => onNavigate(new Date(date.getFullYear() - 1, 0, 1))}
                        className="p-2 hover:bg-white rounded-lg text-text-secondary transition-all shadow-sm hover:shadow active:scale-90"
                    >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button 
                        onClick={() => onNavigate(new Date(date.getFullYear() + 1, 0, 1))}
                        className="p-2 hover:bg-white rounded-lg text-text-secondary transition-all shadow-sm hover:shadow active:scale-90"
                    >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* Grid of Months */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-10 gap-y-12 pb-10">
                {months.map(month => (
                    <MonthCell 
                        key={month.toISOString()} 
                        month={month} 
                        events={events} 
                        onMonthClick={onMonthClick}
                        onDayClick={onDayClick}
                    />
                ))}
            </div>
        </div>
    );
};

interface MonthCellProps {
    month: Date;
    events: CalendarEvent[];
    onMonthClick: (date: Date) => void;
    onDayClick: (date: Date) => void;
}

const MonthCell: React.FC<MonthCellProps> = ({ month, events, onMonthClick, onDayClick }) => {
    const days = useMemo(() => {
        return eachDayOfInterval({
            start: month,
            end: endOfMonth(month)
        });
    }, [month]);

    const startDayIndex = month.getDay(); // 0 Sunday, 1 Monday...
    const isCurrentMonth = isSameMonth(new Date(), month);

    return (
        <div className="flex flex-col gap-3 group">
            {/* Interactive Header */}
            <button 
                onClick={() => onMonthClick(month)}
                className="text-left px-2 py-1 rounded-lg -ml-2 hover:bg-gray-50 transition-colors flex items-center justify-between group/header"
            >
                <h3 className={`text-lg font-bold capitalize ${isCurrentMonth ? 'text-primary' : 'text-gray-900'}`}>
                    {format(month, 'MMMM', { locale: es })}
                </h3>
                <span className="material-symbols-outlined text-gray-300 text-sm opacity-0 group-hover/header:opacity-100 transition-opacity -translate-x-2 group-hover/header:translate-x-0">
                    arrow_forward
                </span>
            </button>
            
            <div className="grid grid-cols-7 text-center">
                {['D','L','M','M','J','V','S'].map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-gray-300 py-1">{d}</span>
                ))}
                
                {/* Empty slots for start of month */}
                {Array.from({ length: startDayIndex }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {/* Days */}
                {days.map(day => {
                    // Check for events
                    const dayEvents = events.filter(e => isSameDay(e.start, day) && e.status !== 'cancelled');
                    const hasEvent = dayEvents.length > 0;
                    const isToday = isSameDay(day, new Date());
                    
                    // Logic for determining dot color priority
                    let dotColor = 'bg-gray-200';
                    if (hasEvent) {
                        if (dayEvents.some(e => e.type === 'exam')) dotColor = 'bg-purple-500';
                        else if (dayEvents.some(e => e.type === 'tournament')) dotColor = 'bg-orange-500';
                        else dotColor = 'bg-blue-500';
                    }

                    return (
                        <button 
                            key={day.toISOString()} 
                            onClick={() => onDayClick(day)}
                            className={`
                                aspect-square flex flex-col items-center justify-center relative rounded-full transition-all duration-200
                                hover:bg-gray-100 active:scale-90 active:bg-gray-200
                                ${isToday ? 'bg-black text-white hover:bg-gray-800' : ''}
                            `}
                        >
                            <span className={`text-xs font-medium z-10 ${hasEvent && !isToday ? 'font-bold text-text-main' : ''} ${!hasEvent && !isToday ? 'text-gray-500' : ''}`}>
                                {format(day, 'd')}
                            </span>
                            {hasEvent && !isToday && (
                                <div className={`size-1.5 rounded-full mt-0.5 ${dotColor}`}></div>
                            )}
                            {/* Dot for today is hidden or styled differently */}
                            {hasEvent && isToday && (
                                <div className="size-1 rounded-full mt-0.5 bg-white"></div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default YearView;
