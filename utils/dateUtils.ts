
/**
 * Returns current date in 'YYYY-MM-DD' format based on user's device timezone.
 * Avoids UTC conversion issues from toISOString().
 */
export const getLocalDate = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formats a 'YYYY-MM-DD' string to a readable format (e.g., 'Lunes, 10 de Oct')
 * safe from timezone shifts by constructing the date manually in local time.
 */
export const formatDateDisplay = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
    if (!dateStr) return '';
    
    // Split explicitly to avoid Date parsing timezone assumptions
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Create date object at local midnight (00:00:00)
    const dateObj = new Date(year, month - 1, day);
    
    const defaultOptions: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'short' 
    };

    return dateObj.toLocaleDateString('es-ES', options || defaultOptions);
};
