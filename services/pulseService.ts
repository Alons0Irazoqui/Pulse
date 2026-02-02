
import { Student, ClassCategory, TuitionRecord, UserProfile, LibraryResource, Event, AcademySettings } from '../types';
import { mockStudents, mockLibraryResources, defaultAcademySettings } from '../mockData';

const STORAGE_KEYS = {
    STUDENTS: 'pulse_students',
    CLASSES: 'pulse_classes',
    USER: 'pulse_current_session', // Session
    USERS_DB: 'pulse_users_db', // Simulating Auth Table
    PAYMENTS: 'pulse_tuition_records', // ALIGNED with FinanceContext
    LIBRARY: 'pulse_library',
    EVENTS: 'pulse_events',
    ACADEMIES: 'pulse_academies' // Simulating Academies Table
};

// Helper for UUID
const uuid = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// --- DATA ENGINEERING HELPER: ATOMIC MERGE ---
// Lee la DB completa, crea un Map por ID para eliminar duplicados,
// fusiona los nuevos items y guarda.
const mergeAndSave = <T extends { id: string }>(key: string, newItems: T[]) => {
    const raw = localStorage.getItem(key);
    const existingItems: T[] = raw ? JSON.parse(raw) : [];
    
    // 1. Indexar existentes por ID para acceso O(1)
    const itemMap = new Map<string, T>();
    existingItems.forEach(item => itemMap.set(item.id, item));

    // 2. Fusionar/Sobrescribir con nuevos items
    newItems.forEach(item => {
        itemMap.set(item.id, item);
    });

    // 3. Serializar y guardar
    const mergedArray = Array.from(itemMap.values());
    localStorage.setItem(key, JSON.stringify(mergedArray));
    return mergedArray;
};

export const PulseService = {
    // --- SECURITY & VALIDATION LAYER ---

    checkEmailExists: (email: string): boolean => {
        const users = PulseService.getUsersDB();
        const normalizedEmail = email.toLowerCase().trim();
        return users.some(u => u.email.toLowerCase().trim() === normalizedEmail);
    },

    // --- AUTHENTICATION LAYER ---

    registerMaster: (data: { name: string; email: string; password: string; academyName: string }) => {
        if (PulseService.checkEmailExists(data.email)) {
            throw new Error("El correo electrónico ya está registrado en la plataforma.");
        }

        // 1. Create Unique Academy ID
        const academyId = uuid(); 
        const academyCode = 'ACAD-' + Math.floor(1000 + Math.random() * 9000);
        
        const newAcademy: AcademySettings = {
            ...defaultAcademySettings,
            id: academyId, // Unique ID per tenant
            name: data.academyName,
            code: academyCode,
            ownerId: '', 
        };

        // 2. Create User linked strictly to this Academy
        const userId = uuid();
        newAcademy.ownerId = userId; 

        const newUser: UserProfile = {
            id: userId,
            email: data.email,
            password: data.password, 
            name: data.name,
            role: 'master',
            academyId: academyId, // STRICT LINK
            avatarUrl: ''
        };

        // 3. Secure Merge Save
        mergeAndSave(STORAGE_KEYS.USERS_DB, [newUser]);
        mergeAndSave(STORAGE_KEYS.ACADEMIES, [newAcademy]);

        return { user: newUser, academy: newAcademy };
    },

    registerStudent: (data: { 
        academyCode: string; 
        email: string; 
        password: string; 
        name: string; 
        cellPhone: string;
        age: number;
        birthDate: string;
        avatarUrl?: string;
        guardianName: string;
        guardianEmail: string;
        guardianRelationship: 'Padre' | 'Madre' | 'Tutor Legal' | 'Familiar' | 'Otro';
        guardianMainPhone: string;
        guardianSecondaryPhone?: string;
        guardianTertiaryPhone?: string;
        street: string;
        exteriorNumber: string;
        interiorNumber?: string;
        colony: string;
        zipCode: string;
    }) => {
        if (PulseService.checkEmailExists(data.email)) {
            throw new Error("El correo electrónico ya está registrado en la plataforma.");
        }

        const academies = PulseService.getAcademiesDB();
        
        // Find academy by ID or Code
        const academy = academies.find(a => a.code === data.academyCode || a.id === data.academyCode);
        if (!academy) {
            throw new Error("Código de academia inválido.");
        }

        const userId = uuid();
        
        // Create User (Auth)
        const newUser: UserProfile = {
            id: userId,
            email: data.email,
            password: data.password,
            name: data.name,
            role: 'student',
            academyId: academy.id, // Linked to specific academy
            avatarUrl: data.avatarUrl || '',
            studentId: userId 
        };

        const initialAmount = Number(academy.paymentSettings?.monthlyTuition) || 0;
        
        // Create Student Profile (Data)
        const newStudent: Student = {
            id: userId,
            userId: userId,
            academyId: academy.id,
            name: data.name,
            email: data.email,
            cellPhone: data.cellPhone,
            age: data.age, 
            birthDate: data.birthDate,
            guardian: {
                fullName: data.guardianName,
                email: data.guardianEmail,
                relationship: data.guardianRelationship,
                phones: { 
                    main: data.guardianMainPhone,
                    secondary: data.guardianSecondaryPhone,
                    tertiary: data.guardianTertiaryPhone
                },
                address: {
                    street: data.street,
                    exteriorNumber: data.exteriorNumber,
                    interiorNumber: data.interiorNumber,
                    colony: data.colony,
                    zipCode: data.zipCode
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
            balance: initialAmount,
            classesId: [],
            attendanceHistory: [],
            avatarUrl: data.avatarUrl || ''
        };

        // Create the initial CHARGE record if tuition is > 0
        if (initialAmount > 0) {
            const today = new Date();
            
            // 1. Generate Concept Name: Mensualidad [Month]
            const monthName = today.toLocaleString('es-ES', { month: 'long' });
            const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            const concept = `Mensualidad ${capitalizedMonth}`;

            // 2. Calculate Due Date based on Academy Settings (lateFeeDay)
            // Logic: Use current year and month, but fix the day to lateFeeDay.
            // If today is past lateFeeDay, the system will naturally mark it as overdue later.
            const lateFeeDay = academy.paymentSettings?.lateFeeDay || 10;
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(lateFeeDay).padStart(2, '0');
            const dueDate = `${year}-${month}-${day}`;

            const initialCharge: TuitionRecord = {
                id: uuid(),
                academyId: academy.id,
                studentId: userId,
                studentName: data.name,
                amount: initialAmount,
                originalAmount: initialAmount,
                penaltyAmount: 0,
                dueDate: dueDate,
                status: 'pending', // Default to pending, FinanceContext will update to 'overdue' if date passed
                type: 'charge', 
                description: 'Cuota mensual regular',
                concept: concept,
                category: 'Mensualidad',
                method: 'System',
                paymentDate: null,
                proofUrl: null,
                canBePaidInParts: false
            };
            // Use safe save for payments
            PulseService.savePayments([initialCharge]);
        }

        // Secure Merge Save
        mergeAndSave(STORAGE_KEYS.USERS_DB, [newUser]);
        mergeAndSave(STORAGE_KEYS.STUDENTS, [newStudent]);

        return newUser;
    },

    createStudentAccountFromMaster: (studentData: Student, defaultPassword = 'Pulse123!') => {
        const users = PulseService.getUsersDB();
        
        // Check existing by email to avoid duplication
        const existing = users.find(u => u.email.toLowerCase() === studentData.email.toLowerCase());
        if (existing) return existing; 

        const userId = studentData.id; 
        const newUser: UserProfile = {
            id: userId,
            email: studentData.email,
            password: defaultPassword,
            name: studentData.name,
            role: 'student',
            academyId: studentData.academyId,
            avatarUrl: studentData.avatarUrl || '', 
            studentId: userId
        };

        // Secure Merge Save
        mergeAndSave(STORAGE_KEYS.USERS_DB, [newUser]);
        return newUser;
    },

    deleteFullStudentData: (studentId: string) => {
        const users = PulseService.getUsersDB();
        const students = PulseService.getStudents();
        const classes = PulseService.getClasses();
        const events = PulseService.getEvents();
        const payments = PulseService.getPayments();
        
        const newUsers = users.filter(u => u.id !== studentId && u.studentId !== studentId);
        const newStudents = students.filter(s => s.id !== studentId);
        
        const newClasses = classes.map(c => {
            if (c.studentIds.includes(studentId)) {
                return {
                    ...c,
                    studentIds: c.studentIds.filter(id => id !== studentId),
                    studentCount: Math.max(0, c.studentCount - 1)
                };
            }
            return c;
        });

        const newEvents = events.map(e => {
            if (e.registrants?.includes(studentId)) {
                return {
                    ...e,
                    registrants: e.registrants.filter(id => id !== studentId),
                    registeredCount: Math.max(0, (e.registeredCount || 0) - 1)
                };
            }
            return e;
        });

        // Keep Paid Records
        const newPayments = payments.filter(p => {
            if (p.studentId === studentId) return p.status === 'paid';
            return true;
        });

        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(newUsers));
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(newStudents));
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(newClasses));
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(newEvents));
        // Save payments directly as we filtered them
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(newPayments));

        return true;
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

    // --- DATA ACCESS LAYER (Read) ---

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
        // Strict Filter by AcademyId if provided
        return academies.find(a => a.id === academyId) || academies[0] || defaultAcademySettings;
    },

    getStudents: (academyId?: string): Student[] => {
        const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        // Fallback to mockStudents only if DB is totally empty (first run)
        let allStudents: Student[] = data ? JSON.parse(data) : mockStudents;
        
        // Data Normalization
        allStudents = allStudents.map(s => ({
            ...s, 
            academyId: s.academyId || 'acad-1',
            balance: Number(s.balance) || 0
        }));
        
        // Strict Isolation: Only return students for the requested academy
        if (academyId) return allStudents.filter(s => s.academyId === academyId);
        return allStudents;
    },

    getClasses: (academyId?: string): ClassCategory[] => {
        const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
        let classes: ClassCategory[] = data ? JSON.parse(data) : [];
        // Seeding logic omitted for brevity, assumed handled or empty is fine
        classes = classes.map(c => ({...c, studentIds: c.studentIds || [], academyId: c.academyId || 'acad-1', modifications: c.modifications || []}));
        
        // Strict Isolation
        if (academyId) return classes.filter(c => c.academyId === academyId);
        return classes;
    },

    getEvents: (academyId?: string): Event[] => {
        const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
        let events: Event[] = data ? JSON.parse(data) : [];
        events = events.map(e => ({
            ...e, 
            registrants: e.registrants || [], 
            academyId: e.academyId || 'acad-1',
            isVisibleToStudents: e.isVisibleToStudents !== undefined ? e.isVisibleToStudents : true
        }));
        
        // Strict Isolation
        if (academyId) return events.filter(e => e.academyId === academyId);
        return events;
    },

    getLibrary: (academyId?: string): LibraryResource[] => {
        const data = localStorage.getItem(STORAGE_KEYS.LIBRARY);
        let libs: LibraryResource[] = data ? JSON.parse(data) : mockLibraryResources;
        libs = libs.map(l => ({...l, academyId: l.academyId || 'acad-1'}));
        
        // Strict Isolation
        if (academyId) return libs.filter(l => l.academyId === academyId);
        return libs;
    },

    getPayments: (academyId?: string): TuitionRecord[] => {
        const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
        let rawPayments: any[] = data ? JSON.parse(data) : [];
        
        const payments: TuitionRecord[] = rawPayments.map(p => ({
            ...p,
            academyId: p.academyId || 'acad-1',
            amount: Number(p.amount) || 0,
            penaltyAmount: Number(p.penaltyAmount) || 0,
            originalAmount: p.originalAmount !== undefined ? Number(p.originalAmount) : undefined,
            declaredAmount: p.declaredAmount !== undefined ? Number(p.declaredAmount) : undefined,
            paymentDate: p.paymentDate || null
        }));

        // Strict Isolation
        if (academyId) return payments.filter(p => p.academyId === academyId);
        return payments;
    },

    // --- DATA PERSISTENCE LAYER (Write with Merge) ---

    saveAcademySettings: (settings: AcademySettings) => {
        mergeAndSave(STORAGE_KEYS.ACADEMIES, [settings]);
    },

    saveStudents: (studentsToSave: Student[]) => {
        // Use generic merge helper
        // This ensures we don't wipe out other academies' students
        mergeAndSave(STORAGE_KEYS.STUDENTS, studentsToSave);
    },

    saveClasses: (classesToSave: ClassCategory[]) => {
        mergeAndSave(STORAGE_KEYS.CLASSES, classesToSave);
    },

    saveEvents: (eventsToSave: Event[]) => {
        mergeAndSave(STORAGE_KEYS.EVENTS, eventsToSave);
    },

    saveLibrary: (resourcesToSave: LibraryResource[]) => {
        mergeAndSave(STORAGE_KEYS.LIBRARY, resourcesToSave);
    },

    savePayments: (paymentsToSave: TuitionRecord[]) => {
        // Sanitize numbers before saving
        const sanitizedPayments = paymentsToSave.map(p => ({
            ...p,
            amount: Number(p.amount),
            penaltyAmount: Number(p.penaltyAmount || 0),
            originalAmount: p.originalAmount !== undefined ? Number(p.originalAmount) : undefined,
            declaredAmount: p.declaredAmount !== undefined ? Number(p.declaredAmount) : undefined,
        }));
        mergeAndSave(STORAGE_KEYS.PAYMENTS, sanitizedPayments);
    },

    deletePayment: (recordId: string) => {
        // CRITICAL FIX: Actually remove from storage, do not use mergeAndSave which only updates/adds.
        // This ensures that when a record is deleted in UI, it stays deleted in DB.
        const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
        const allPayments = raw ? JSON.parse(raw) : [];
        const filtered = allPayments.filter((p: any) => p.id !== recordId);
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(filtered));
    },

    // --- BUSINESS LOGIC HELPERS ---

    enrollStudentInClass: (studentId: string, classId: string, students: Student[], classes: ClassCategory[]) => {
        const updatedClasses = classes.map(c => {
            if (c.id === classId && !c.studentIds.includes(studentId)) {
                return { ...c, studentIds: [...c.studentIds, studentId], studentCount: c.studentCount + 1 };
            }
            return c;
        });

        const updatedStudents = students.map(s => {
            if (s.id === studentId) {
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

    updatePaymentRecord: (updatedRecord: TuitionRecord) => {
        // Delegate to merge saver
        mergeAndSave(STORAGE_KEYS.PAYMENTS, [updatedRecord]);
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
