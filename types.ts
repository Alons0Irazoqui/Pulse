
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
    id: string; // UUID
    name: string;
    code: string; // Shareable Code
    modules: {
        library: boolean;
        payments: boolean;
        attendance: boolean;
    };
    paymentSettings: {
        lateFeeAmount: number;
        lateFeeGracePeriod: number;
        monthlyTuition: number; // Automated billing amount
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

// Detailed attendance record
export interface AttendanceRecord {
    date: string; // ISO Date "YYYY-MM-DD"
    classId: string; // Specific class context
    status: 'present' | 'late' | 'excused' | 'absent';
    timestamp: string; // ISO Full Timestamp
    reason?: string; // Optional justification or note
}

export interface Student {
    id: string; // Linked to UserProfile ID
    userId: string; // Foreign Key to User
    academyId: string; // Foreign Key to Academy
    name: string;
    email: string;
    phone?: string;
    rank: string;
    rankId: string;
    rankColor: RankColor;
    stripes: number;
    status: StudentStatus;
    program: string;
    attendance: number; // Total count for quick access
    totalAttendance: number; // Historical total
    lastAttendance?: string;
    attendanceHistory: AttendanceRecord[]; // The array of objects
    joinDate: string;
    avatarUrl?: string;
    balance: number; // Positive means DEBT
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

// --- SESSION EXCEPTION LOGIC ---
export interface SessionModification {
    date: string; // The original date of the class (YYYY-MM-DD)
    type: 'cancel' | 'move' | 'instructor' | 'time';
    newDate?: string; // If moved
    newStartTime?: string; // Overrides default start time
    newEndTime?: string;   // Overrides default end time
    newInstructor?: string; // Overrides default instructor
}

// Alias for the requested type name, extending SessionModification for compatibility
export interface ClassException extends SessionModification {
    id?: string;
    reason?: string;
}

export interface ClassCategory {
    id: string;
    academyId: string;
    name: string;
    schedule: string; // Display string (e.g. "Lun/Mie 17:00")
    days: string[]; // Structured data: ['Monday', 'Wednesday']
    startTime: string; // "17:00" - Mandatory
    endTime: string;   // "18:15" - Mandatory
    instructor: string; // Default instructor
    studentCount: number;
    studentIds: string[];
    modifications: ClassException[]; // Array of exceptions to the rule
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

export interface Payment {
    id: string;
    academyId: string;
    studentId: string;
    studentName?: string;
    amount: number;
    date: string;
    status: 'paid' | 'pending_approval' | 'pending' | 'failed'; 
    type: 'charge' | 'payment'; // CHARGE = Deuda (+Balance), PAYMENT = Abono (-Balance)
    description: string;
    category: PaymentCategory;
    method?: string;
    proofUrl?: string; 
    proofType?: string; 
}

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