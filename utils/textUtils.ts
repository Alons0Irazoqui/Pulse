
import { StudentStatus } from '../types';

export const getStatusLabel = (status: StudentStatus): string => {
    switch (status) {
        case 'active': return 'Activo';
        case 'inactive': return 'Inactivo';
        case 'debtor': return 'Con Adeudo';
        case 'exam_ready': return 'Listo para Examen';
        default: return 'Desconocido';
    }
};
