import { Student, ClassCategory, FinancialRecord, UserProfile, LibraryResource, Event, AcademySettings } from '../types';
import { mockStudents, mockLibraryResources, defaultAcademySettings } from '../mockData';

const STORAGE_KEYS = {
    STUDENTS: 'pulse_students',
    CLASSES: 'pulse_classes',
    USER: 'pulse_current_session', // Session
    USERS_DB: 'pulse_users_db', // Simulating Auth Table
    PAYMENTS: 'pulse_payments',
    LIBRARY: 'pulse_library',
    EVENTS: 'pulse_events',
    ACADEMIES: 'pulse_academies' // Simulating Academies Table
};

// Helper for UUID
const uuid = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const PulseService = {
    // --- AUTHENTICATION LAYER ---

    registerMaster: (data: { name: string; email: string; password: string; academyName: string }) => {
        const users = PulseService.getUsersDB();
        const academies = PulseService.getAcademiesDB();

        if (users.find(u => u.email === data.email)) {
            throw new Error("El correo electrónico ya está registrado.");
        }

        // 1. Create Academy
        const academyId = uuid();
        const academyCode = 'ACAD-' + Math.floor(1000 + Math.random() * 9000);
        const newAcademy: AcademySettings = {
            ...defaultAcademySettings,
            id: academyId,
            name: data.academyName,
            code: academyCode,
            ownerId: '', 
        };

        // 2. Create User
        const userId = uuid();
        newAcademy.ownerId = userId; 

        const newUser: UserProfile = {
            id: userId,
            email: data.email,
            password: data.password, 
            name: data.name,
            role: 'master',
            academyId: academyId,
            avatarUrl: `https://i.pravatar.cc/150?u=${userId}`
        };

        // 3. Commit to DB
        users.push(newUser);
        academies.push(newAcademy);
        
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEYS.ACADEMIES, JSON.stringify(academies));

        return { user: newUser, academy: newAcademy };
    },

    registerStudent: (data: { name: string; email: string; phone: string; password: string; academyCode: string }) => {
        const users = PulseService.getUsersDB();
        const academies = PulseService.getAcademiesDB();
        const students = PulseService.getStudents();
        const payments = PulseService.getPayments(); // Fetch existing records

        if (users.find(u => u.email === data.email)) {
            throw new Error("El correo electrónico ya está registrado.");
        }

        const academy = academies.find(a => a.code === data.academyCode || a.id === data.academyCode);
        if (!academy) {
            throw new Error("Código de academia inválido.");
        }

        const userId = uuid();
        const newUser: UserProfile = {
            id: userId,
            email: data.email,
            password: data.password,
            name: data.name,
            role: 'student',
            academyId: academy.id,
            avatarUrl: `https://i.pravatar.cc/150?u=${userId}`,
            studentId: userId 
        };

        // AUTOMATIC DEBT GENERATION LOGIC
        const initialAmount = academy.paymentSettings?.monthlyTuition || 0;
        
        const newStudent: Student = {
            id: userId,
            userId: userId,
            academyId: academy.id,
            name: data.name,
            email: data.email,
            cellPhone: data.phone,
            age: 0, 
            birthDate: new Date().toISOString().split('T')[0],
            guardian: {
                fullName: 'N/A',
                email: 'N/A',
                phones: { main: 'N/A' },
                relationship: 'Otro',
                address: {
                    street: 'N/A',
                    exteriorNumber: 'N/A',
                    colony: 'N/A',
                    zipCode: '00000'
                }
            },
            rank: 'White Belt',
            rankId: academy.ranks[0].id,
            rankColor: 'white',
            stripes: 0,
            status: initialAmount > 0 ? 'debtor' : 'active', 
            program: 'Adults',
            attendance: 0,
            totalAttendance: 0,
            joinDate: new Date().toLocaleDateString(),
            balance: initialAmount, // Set initial balance reference (will be recalculated by Store)
            classesId: [],
            attendanceHistory: [],
            avatarUrl: newUser.avatarUrl
        };

        // Create the initial CHARGE record
        if (initialAmount > 0) {
            const initialCharge: FinancialRecord = {
                id: uuid(),
                academyId: academy.id,
                studentId: userId,
                studentName: data.name,
                amount: initialAmount,
                date: new Date().toISOString().split('T')[0],
                status: 'charged', // STRICT STATUS
                type: 'charge', 
                description: 'Mensualidad (Inscripción)',
                category: 'Mensualidad',
                method: 'System'
            };
            payments.push(initialCharge);
            localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
        }

        users.push(newUser);
        students.push(newStudent);
        
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

        return newUser;
    },

    // NEW: Auto-create account when Master adds student manually
    createStudentAccountFromMaster: (studentData: Student, defaultPassword = 'Pulse123!') => {
        const users = PulseService.getUsersDB();
        
        // If user already exists, just link
        const existingUser = users.find(u => u.email === studentData.email);
        if (existingUser) return existingUser;

        const userId = studentData.id; // Ensure IDs match
        const newUser: UserProfile = {
            id: userId,
            email: studentData.email,
            password: defaultPassword,
            name: studentData.name,
            role: 'student',
            academyId: studentData.academyId,
            avatarUrl: studentData.avatarUrl || `https://i.pravatar.cc/150?u=${userId}`,
            studentId: userId
        };

        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
        return newUser;
    },

    login: (email: string, password: string): UserProfile => {
        const users = PulseService.getUsersDB();
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) throw new Error("Credenciales inválidas.");
        PulseService.saveCurrentUser(user);
        return user;
    },

    logout: () => {
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    // --- DATA ACCESS LAYER ---

    getUsersDB: (): UserProfile[] => {
        const data = localStorage.getItem(STORAGE_KEYS.USERS_DB);
        return data ? JSON.parse(data) : [];
    },

    getAcademiesDB: (): AcademySettings[] => {
        const data = localStorage.getItem(STORAGE_KEYS.ACADEMIES);
        if (!data) {
            const seed = [{ ...defaultAcademySettings, id: 'acad-1', code: 'DEMO-123', ownerId: 'm1' }];
            localStorage.setItem(STORAGE_KEYS.ACADEMIES, JSON.stringify(seed));
            return seed;
        }
        return JSON.parse(data);
    },

    getAcademySettings: (academyId?: string): AcademySettings => {
        const academies = PulseService.getAcademiesDB();
        return academies.find(a => a.id === academyId) || academies[0] || defaultAcademySettings;
    },

    saveAcademySettings: (settings: AcademySettings) => {
        const academies = PulseService.getAcademiesDB();
        const index = academies.findIndex(a => a.id === settings.id);
        if (index >= 0) academies[index] = settings;
        else academies.push(settings);
        localStorage.setItem(STORAGE_KEYS.ACADEMIES, JSON.stringify(academies));
    },

    getStudents: (academyId?: string): Student[] => {
        const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        let allStudents: Student[] = data ? JSON.parse(data) : mockStudents;
        allStudents = allStudents.map(s => ({...s, academyId: s.academyId || 'acad-1'}));
        if (academyId) return allStudents.filter(s => s.academyId === academyId);
        return allStudents;
    },

    saveStudents: (students: Student[]) => {
        const currentAcademyId = students[0]?.academyId;
        if (!currentAcademyId) {
             localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
             return;
        }
        const allStudents = PulseService.getStudents(); 
        const otherStudents = allStudents.filter(s => s.academyId !== currentAcademyId);
        const newState = [...otherStudents, ...students];
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(newState));
    },

    getClasses: (academyId?: string): ClassCategory[] => {
        const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
        let classes: ClassCategory[] = data ? JSON.parse(data) : [];
        if (classes.length === 0) {
             classes = [
                { 
                    id: 'c1', 
                    academyId: 'acad-1', 
                    name: 'Kids Fundamentals', 
                    schedule: 'Lun/Mie 16:00', 
                    days: ['Monday', 'Wednesday'], 
                    startTime: '16:00', 
                    endTime: '17:00',
                    instructor: 'Sensei Miguel', 
                    studentCount: 12, 
                    studentIds: [],
                    modifications: []
                },
                { 
                    id: 'c2', 
                    academyId: 'acad-1', 
                    name: 'Adults Advanced', 
                    schedule: 'Mar/Jue 19:00', 
                    days: ['Tuesday', 'Thursday'], 
                    startTime: '19:00', 
                    endTime: '20:30', 
                    instructor: 'Master Kenji', 
                    studentCount: 8, 
                    studentIds: [],
                    modifications: []
                }
            ];
        }
        classes = classes.map(c => ({...c, studentIds: c.studentIds || [], academyId: c.academyId || 'acad-1', modifications: c.modifications || []}));
        if (academyId) return classes.filter(c => c.academyId === academyId);
        return classes;
    },

    saveClasses: (classes: ClassCategory[]) => {
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
    },

    enrollStudentInClass: (studentId: string, classId: string, students: Student[], classes: ClassCategory[]) => {
        // Update Classes
        const updatedClasses = classes.map(c => {
            if (c.id === classId && !c.studentIds.includes(studentId)) {
                return { ...c, studentIds: [...c.studentIds, studentId], studentCount: c.studentCount + 1 };
            }
            return c;
        });

        // Update Students (Critical for Student Dashboard Synchronization)
        const updatedStudents = students.map(s => {
            if (s.id === studentId) {
                // Ensure classesId array exists
                const currentClasses = s.classesId || [];
                if (!currentClasses.includes(classId)) {
                    return { ...s, classesId: [...currentClasses, classId] };
                }
            }
            return s;
        });

        return { updatedClasses, updatedStudents };
    },

    unenrollStudentFromClass: (studentId: string, classId: string, students: Student[], classes: ClassCategory[]) => {
        const updatedClasses = classes.map(c => {
            if (c.id === classId) {
                return { 
                    ...c, 
                    studentIds: c.studentIds.filter(id => id !== studentId),
                    studentCount: Math.max(0, c.studentCount - 1)
                };
            }
            return c;
        });

        const updatedStudents = students.map(s => {
            if (s.id === studentId && s.classesId) {
                return { ...s, classesId: s.classesId.filter(id => id !== classId) };
            }
            return s;
        });

        return { updatedClasses, updatedStudents };
    },

    getEvents: (academyId?: string): Event[] => {
        const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
        let events: Event[] = data ? JSON.parse(data) : [];
        events = events.map(e => ({...e, registrants: e.registrants || [], academyId: e.academyId || 'acad-1'}));
        if (academyId) return events.filter(e => e.academyId === academyId);
        return events;
    },

    saveEvents: (events: Event[]) => {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    },

    registerStudentForEvent: (studentId: string, eventId: string, events: Event[]) => {
        return events.map(e => {
            if(e.id === eventId && !e.registrants?.includes(studentId)) {
                return { 
                    ...e, 
                    registrants: [...(e.registrants || []), studentId], 
                    registeredCount: (e.registeredCount || 0) + 1 
                };
            }
            return e;
        });
    },

    updateEventRegistrants: (events: Event[], eventId: string, studentIds: string[]) => {
        return events.map(e => {
            if (e.id === eventId) {
                return {
                    ...e,
                    registrants: studentIds,
                    registeredCount: studentIds.length
                };
            }
            return e;
        });
    },

    getLibrary: (academyId?: string): LibraryResource[] => {
        const data = localStorage.getItem(STORAGE_KEYS.LIBRARY);
        let libs: LibraryResource[] = data ? JSON.parse(data) : mockLibraryResources;
        libs = libs.map(l => ({...l, academyId: l.academyId || 'acad-1'}));
        if (academyId) return libs.filter(l => l.academyId === academyId);
        return libs;
    },

    saveLibrary: (resources: LibraryResource[]) => {
        localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(resources));
    },

    getPayments: (academyId?: string): FinancialRecord[] => {
        const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
        let payments: FinancialRecord[] = data ? JSON.parse(data) : [];
        payments = payments.map(p => ({...p, academyId: p.academyId || 'acad-1'}));
        if (academyId) return payments.filter(p => p.academyId === academyId);
        return payments;
    },

    savePayments: (payments: FinancialRecord[]) => {
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    },
    
    getCurrentUser: (): UserProfile | null => {
        const data = localStorage.getItem(STORAGE_KEYS.USER);
        return data ? JSON.parse(data) : null;
    },
    
    saveCurrentUser: (user: UserProfile | null) => {
        if (user) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEYS.USER);
        }
    }
};