
export type RankColor = 'white' | 'yellow' | 'orange' | 'green' | 'blue' | 'purple' | 'brown' | 'black';
export type StudentStatus = 'active' | 'inactive' | 'debtor' | 'exam_ready';

export interface Rank {
    id: string;
    name: string;
    color: RankColor;
    order: number;
    requiredAttendance: number;
}

export interface BankDetails {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    clabe: string;
    instructions?: string;
}

export interface AcademySettings {
    id: string;
    name: string;
    code: string;
    modules: {
        library: boolean;
        payments: boolean;
        attendance: boolean;
    };
    paymentSettings: {
        lateFeeAmount: number;
        lateFeeGracePeriod: number;
        monthlyTuition: number;
        billingDay: number;
        lateFeeDay: number;
    };
    bankDetails?: BankDetails;
    ranks: Rank[];
    ownerId: string;
}

export interface PromotionHistoryItem {
    rank: string;
    date: string;
    notes?: string;
}

export interface AttendanceRecord {
    date: string;
    classId: string;
    status: 'present' | 'late' | 'excused' | 'absent';
    timestamp: string;
    reason?: string;
}

export interface Student {
    id: string;
    userId: string;
    academyId: string;
    name: string;
    email: string;
    phone?: string;
    rank: string;
    rankId: string;
    rankColor: RankColor;
    stripes: number;
    status: StudentStatus;
    program: string;
    attendance: number;
    totalAttendance: number;
    lastAttendance?: string;
    attendanceHistory: AttendanceRecord[];
    joinDate: string;
    avatarUrl?: string;
    balance: number; // Derived state (Charges - Paid Payments)
    classesId: string[];
    promotionHistory?: PromotionHistoryItem[];
    notes?: Note[];
}

export interface Note {
    id: string;
    date: string;
    content: string;
    author: string;
}

export interface SessionModification {
    date: string;
    type: 'cancel' | 'move' | 'instructor' | 'time';
    newDate?: string;
    newStartTime?: string;
    newEndTime?: string;
    newInstructor?: string;
}

export interface ClassException extends SessionModification {
    id?: string;
    reason?: string;
}

export interface ClassCategory {
    id: string;
    academyId: string;
    name: string;
    schedule: string;
    days: string[];
    startTime: string;
    endTime: string;
    instructor: string;
    studentCount: number;
    studentIds: string[];
    modifications: ClassException[];
}

export interface Event {
    id: string;
    academyId: string;
    title: string;
    date: string;
    time: string;
    type: 'seminar' | 'exam' | 'tournament';
    description: string;
    registeredCount: number;
    capacity: number;
    eligibleRanks?: string[];
    registrants?: string[];
}

export type PaymentCategory = 'Mensualidad' | 'Torneo' | 'Examen/Promoción' | 'Equipo/Uniforme' | 'Otro' | 'Late Fee';

// --- FINANCIAL CORE ---
export type TransactionType = 'charge' | 'payment';
// Charge: A debt created by the system/master. Always 'charged'.
// Payment: A money transfer attempt by student. Can be pending, paid, or rejected.
export type TransactionStatus = 'charged' | 'pending_approval' | 'paid' | 'rejected';

export interface FinancialRecord {
    id: string;
    academyId: string;
    studentId: string;
    studentName?: string;
    amount: number;
    date: string; // ISO YYYY-MM-DD
    
    // Strict typing based on architecture requirements
    type: TransactionType;
    status: TransactionStatus;
    
    description: string;
    category: PaymentCategory;
    method?: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'System';
    
    // Proof for payments
    proofUrl?: string; 
    proofType?: string; 
    
    // Audit
    processedBy?: string;
    processedAt?: string;
}

// Alias for backward compatibility during refactor if needed, ensuring new code uses FinancialRecord
export type Payment = FinancialRecord; 

export interface UserProfile {
    id: string;
    email: string;
    role: 'master' | 'student';
    name: string;
    avatarUrl: string;
    academyId: string; 
    studentId?: string; 
    password?: string; 
    paymentMethods?: { id: string; brand: string; last4: string; expMonth: number; expYear: number }[];
}

export interface LibraryResource {
    id: string;
    academyId: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    duration: string;
    category: 'Technique' | 'Sparring' | 'Mindset' | 'History';
    level: string;
    videoUrl: string;
    completedBy: string[];
}

export interface FinanceStat {
    label: string;
    value: string;
    trend: number;
    trendLabel: string;
    icon: string;
    color: string;
}

export interface ClassSession {
    id: string;
    name: string;
    time: string;
    instructor: string;
    totalStudents: number;
    enrolled: number;
    attendees: {
        studentId: string;
        name: string;
        rank: string;
        status: 'present' | 'absent' | 'late' | 'unmarked';
        avatarUrl: string;
        note?: string;
    }[];
}

export interface ScheduleItem {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    title: string;
    instructor: string;
    level: string;
    type: 'gi' | 'nogi' | 'striking';
    enrolled: boolean;
}

export interface Invoice {
    id: string;
    date: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    description: string;
    method?: string;
}

export interface Message {
    id: string;
    academyId: string;
    senderId: string;
    senderName: string;
    recipientId: string | 'all'; 
    recipientName: string;
    subject: string;
    content: string;
    date: string;
    read: boolean;
    type: 'announcement' | 'personal';
}
