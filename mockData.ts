
import { Student, ClassSession, FinanceStat, ScheduleItem, Invoice, Message, LibraryResource, AcademySettings } from './types';

export const defaultRanks = [
    { id: 'rank-1', name: 'White Belt', color: 'white' as const, order: 1, requiredAttendance: 50 },
    { id: 'rank-2', name: 'Blue Belt', color: 'blue' as const, order: 2, requiredAttendance: 120 },
    { id: 'rank-3', name: 'Purple Belt', color: 'purple' as const, order: 3, requiredAttendance: 150 },
    { id: 'rank-4', name: 'Brown Belt', color: 'brown' as const, order: 4, requiredAttendance: 200 },
    { id: 'rank-5', name: 'Black Belt', color: 'black' as const, order: 5, requiredAttendance: 500 },
];

export const defaultAcademySettings: AcademySettings = {
    id: 'acad-1',
    code: 'DEMO-123',
    ownerId: 'm1',
    name: 'Pulse Academy',
    modules: {
        library: true,
        payments: true,
        attendance: true,
    },
    paymentSettings: {
        lateFeeAmount: 150,
        lateFeeGracePeriod: 5,
        monthlyTuition: 800,
        billingDay: 1,
        lateFeeDay: 10
    },
    bankDetails: {
        bankName: 'BBVA Bancomer',
        accountHolder: 'Pulse Academy S.A. de C.V.',
        accountNumber: '1234567890',
        clabe: '012345678901234567',
        instructions: 'Por favor incluye tu nombre completo en la referencia del pago.'
    },
    ranks: defaultRanks
};

export const mockStudents: Student[] = [
    {
        id: '8821',
        userId: 'u-8821',
        academyId: 'acad-1',
        name: 'Mateo Silva',
        age: 8,
        birthDate: '2015-05-10',
        email: 'mateo.student@example.com',
        cellPhone: '5551234567',
        password: 'password123',
        rank: 'White Belt',
        rankId: 'rank-1',
        rankColor: 'white',
        status: 'active',
        program: 'Kids Program',
        attendance: 35,
        totalAttendance: 35,
        joinDate: 'Aug 15, 2023',
        avatarUrl: 'https://i.pravatar.cc/150?u=mateo',
        stripes: 2,
        balance: 0,
        classesId: [],
        attendanceHistory: [],
        promotionHistory: [
            { rank: 'White Belt', date: 'Aug 15, 2023', notes: 'Joined Academy' }
        ],
        guardian: {
            fullName: 'Roberto Silva',
            email: 'roberto.padre@example.com',
            relationship: 'Padre',
            phones: {
                main: '5559876543',
                secondary: '5551112222'
            },
            address: {
                street: 'Av. Reforma',
                exteriorNumber: '123',
                colony: 'Centro',
                zipCode: '06600',
                city: 'CDMX'
            }
        }
    },
    {
        id: '7442',
        userId: 'u-7442',
        academyId: 'acad-1',
        name: 'Lucia Mendez',
        age: 24,
        birthDate: '1999-11-22',
        email: 'lucia@example.com',
        cellPhone: '5559876543',
        password: 'password123',
        rank: 'Blue Belt',
        rankId: 'rank-2',
        rankColor: 'blue',
        status: 'debtor',
        program: 'Adults',
        attendance: 45,
        totalAttendance: 165,
        joinDate: 'Jan 10, 2022',
        avatarUrl: 'https://i.pravatar.cc/150?u=lucia',
        stripes: 1,
        balance: 150,
        classesId: [],
        attendanceHistory: [],
        promotionHistory: [
            { rank: 'White Belt', date: 'Jan 10, 2022', notes: 'Joined Academy' },
            { rank: 'Blue Belt', date: 'Dec 05, 2022', notes: 'Exceptional performance in Guard Passing' }
        ],
        guardian: {
            fullName: 'Lucia Mendez (Self)',
            email: 'lucia@example.com',
            relationship: 'Otro', // Self-responsible
            phones: {
                main: '5559876543'
            },
            address: {
                street: 'Calle Pino',
                exteriorNumber: '45',
                interiorNumber: '3B',
                colony: 'Del Valle',
                zipCode: '03100',
                city: 'CDMX'
            }
        }
    }
];

export const mockLibraryResources: LibraryResource[] = [
    {
        id: 'lib-1',
        academyId: 'acad-1',
        title: 'Armbar Fundamentals',
        description: 'Master the basics of the armbar from closed guard. Key details for leverage and control.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop',
        duration: '12:45',
        category: 'Technique',
        level: 'White Belt',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
        completedBy: []
    },
    {
        id: 'lib-2',
        academyId: 'acad-1',
        title: 'Advanced Guard Passing',
        description: 'Dynamic passing sequences combining toreando and knee slice passes.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2072&auto=format&fit=crop',
        duration: '18:20',
        category: 'Technique',
        level: 'Blue Belt',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 
        completedBy: ['8821']
    }
];

export const mockClassSession: ClassSession = {
    id: 'c1',
    name: 'Jiu-Jitsu Intermedio',
    time: '18:00 - 19:30',
    instructor: 'Master Kenji',
    totalStudents: 30,
    enrolled: 24,
    attendees: []
};

export const financeStats: FinanceStat[] = [
    { label: 'Monthly Revenue', value: '$12,450', trend: 12, trendLabel: 'vs last month', icon: 'payments', color: 'green' },
    { label: 'Active Students', value: '142', trend: 5, trendLabel: 'new enrollments', icon: 'groups', color: 'blue' },
];

export const revenueData = [
    { name: 'Aug', value: 4000 },
    { name: 'Sep', value: 3000 },
    { name: 'Oct', value: 5000 },
    { name: 'Nov', value: 7000 },
    { name: 'Dec', value: 6000 },
    { name: 'Jan', value: 9000 },
];

export const mockSchedule: ScheduleItem[] = [
    { id: '1', day: 'Monday', startTime: '07:00 AM', endTime: '08:00 AM', title: 'Morning Drilling', instructor: 'Prof. Miguel', level: 'All Levels', type: 'gi', enrolled: true },
    { id: '2', day: 'Monday', startTime: '06:00 PM', endTime: '07:30 PM', title: 'Fundamentals', instructor: 'Coach Sarah', level: 'White Belt', type: 'gi', enrolled: false },
];

export const mockInvoices: Invoice[] = [
    { id: 'INV-2023-001', date: 'Dec 01, 2023', amount: 150.00, status: 'pending', description: 'Monthly Membership - Unlimited' },
];

export const mockMessages: Message[] = [
    { 
        id: '1', 
        academyId: 'acad-1',
        senderId: 'm1',
        senderName: 'Pulse Academy', 
        recipientId: 'all', 
        recipientName: 'Everyone',
        subject: 'Holiday Schedule Changes', 
        content: 'Please note that the academy will be closed on December 25th...', 
        date: '2 days ago', 
        read: false, 
        type: 'announcement' 
    },
];
