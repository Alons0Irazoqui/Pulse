
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

// --- EXTENDED DATA STRUCTURES ---

export interface Address {
    street: string;
    exteriorNumber: string;
    interiorNumber?: string;
    colony: string;
    zipCode: string;
    city?: string;
    state?: string;
}

export interface ContactPhones {
    main: string;
    secondary?: string;
    tertiary?: string;
}

export interface GuardianProfile {
    fullName: string;
    email: string;
    phones: ContactPhones;
    relationship: 'Padre' | 'Madre' | 'Tutor Legal' | 'Familiar' | 'Otro';
    address: Address;
}

export interface Note {
    id: string;
    date: string;
    content: string;
    author: string;
}

export interface Student {
    id: string;
    userId: string;
    academyId: string;
    
    // Auth & Identity
    email: string;
    password?: string; // Optional in state, required in DB/Registration
    
    // Alumno Profile
    name: string;
    age: number;
    birthDate: string; // ISO Date YYYY-MM-DD
    cellPhone: string;
    avatarUrl?: string;
    
    // Guardian / Responsible Party
    guardian: GuardianProfile;

    // Academic Data
    rank: string;
    rankId: string;
    rankColor: RankColor;
    stripes: number;
    status: StudentStatus;
    program: string;
    
    // Computed / Activity Data
    attendance: number;
    totalAttendance: number;
    lastAttendance?: string;
    attendanceHistory: AttendanceRecord[];
    joinDate: string;
    balance: number; 
    classesId: string[];
    promotionHistory?: PromotionHistoryItem[];
    notes?: Note[];
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

export type TransactionType = 'charge' | 'payment';
export type TransactionStatus = 'charged' | 'pending_approval' | 'paid' | 'rejected';

export interface FinancialRecord {
    id: string;
    academyId: string;
    studentId: string;
    studentName?: string;
    amount: number;
    date: string; 
    type: TransactionType;
    status: TransactionStatus;
    description: string;
    category: PaymentCategory;
    method?: 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'System';
    proofUrl?: string; 
    proofType?: string; 
    processedBy?: string;
    processedAt?: string;
}

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
