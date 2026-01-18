
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

export const PulseService = {
    // --- SECURITY & VALIDATION LAYER ---

    /**
     * Checks if an email already exists in the system (Students or Masters).
     * Case insensitive.
     */
    checkEmailExists: (email: string): boolean => {
        const users = PulseService.getUsersDB();
        const normalizedEmail = email.toLowerCase().trim();
        return users.some(u => u.email.toLowerCase().trim() === normalizedEmail);
    },

    // --- AUTHENTICATION LAYER ---

    registerMaster: (data: { name: string; email: string; password: string; academyName: string }) => {
        // Double check internally even if UI checked it
        if (PulseService.checkEmailExists(data.email)) {
            throw new Error("El correo electrónico ya está registrado en la plataforma.");
        }

        const users = PulseService.getUsersDB();
        const academies = PulseService.getAcademiesDB();

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
            avatarUrl: '' // Empty to trigger initial avatar
        };

        // 3. Commit to DB
        users.push(newUser);
        academies.push(newAcademy);
        
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
        localStorage.setItem(STORAGE_KEYS.ACADEMIES, JSON.stringify(academies));

        return { user: newUser, academy: newAcademy };
    },

    registerStudent: (data: { 
        // Auth & Link
        academyCode: string; 
        email: string; 
        password: string; 
        
        // Student Info
        name: string; 
        cellPhone: string;
        age: number;
        birthDate: string;
        avatarUrl?: string; // Optional Avatar

        // Guardian Info
        guardianName: string;
        guardianEmail: string;
        guardianRelationship: 'Padre' | 'Madre' | 'Tutor Legal' | 'Familiar' | 'Otro';
        guardianMainPhone: string;
        guardianSecondaryPhone?: string;
        guardianTertiaryPhone?: string;

        // Address
        street: string;
        exteriorNumber: string;
        interiorNumber?: string;
        colony: string;
        zipCode: string;
    }) => {
        // Double check internally
        if (PulseService.checkEmailExists(data.email)) {
            throw new Error("El correo electrónico ya está registrado en la plataforma.");
        }

        const users = PulseService.getUsersDB();
        const academies = PulseService.getAcademiesDB();
        const students = PulseService.getStudents();
        const payments = PulseService.getPayments(); // Fetch existing records

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
            academyId: academy.id,
            avatarUrl: data.avatarUrl || '',
            studentId: userId 
        };

        // AUTOMATIC DEBT GENERATION LOGIC
        // Ensure strictly NUMBER
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
            balance: initialAmount, // Set initial balance reference
            classesId: [],
            attendanceHistory: [],
            avatarUrl: data.avatarUrl || ''
        };

        // Create the initial CHARGE record
        if (initialAmount > 0) {
            const initialCharge: TuitionRecord = {
                id: uuid(),
                academyId: academy.id,
                studentId: userId,
                studentName: data.name,
                amount: initialAmount,
                originalAmount: initialAmount, // Ensure original is set
                penaltyAmount: 0,
                dueDate: new Date().toISOString().split('T')[0],
                status: 'charged', // STRICT STATUS
                type: 'charge', 
                description: 'Mensualidad (Inscripción)',
                concept: 'Mensualidad (Inscripción)',
                category: 'Mensualidad',
                method: 'System',
                paymentDate: null,
                proofUrl: null,
                canBePaidInParts: false
            };
            payments.push(initialCharge);
            PulseService.savePayments(payments); // Use the safe save method
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
        
        // Check if email exists (excluding the user we might be trying to link if logic allowed linking)
        // But for creation, it must be unique.
        if (PulseService.checkEmailExists(studentData.email)) {
             // In a real app we might want to link existing user, but for security in this demo, we block duplicates.
             // However, the caller (AcademyContext) might have already checked.
             // We return existing user if found to be safe, or throw.
             const existing = users.find(u => u.email.toLowerCase() === studentData.email.toLowerCase());
             if (existing) return existing; 
        }

        const userId = studentData.id; // Ensure IDs match
        const newUser: UserProfile = {
            id: userId,
            email: studentData.email,
            password: defaultPassword,
            name: studentData.name,
            role: 'student',
            academyId: studentData.academyId,
            avatarUrl: studentData.avatarUrl || '', // Empty fallback
            studentId: userId
        };

        users.push(newUser);
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(users));
        return newUser;
    },

    // --- HARD DELETE LOGIC (CRUD FIX) ---
    deleteFullStudentData: (studentId: string) => {
        // 1. Load all data
        const users = PulseService.getUsersDB();
        const students = PulseService.getStudents();
        const classes = PulseService.getClasses();
        const events = PulseService.getEvents();
        const payments = PulseService.getPayments();
        
        // 2. Filter Users (Remove Login/Email/Phone record)
        // We match by ID or linked StudentID to be safe
        const newUsers = users.filter(u => u.id !== studentId && u.studentId !== studentId);
        
        // 3. Filter Students (Remove Profile)
        const newStudents = students.filter(s => s.id !== studentId);
        
        // 4. Clean Classes (Remove enrollment)
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

        // 5. Clean Events (Remove registration)
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

        // 6. Clean Payments (Remove pending debts, KEEP paid history)
        // Keep records that are PAID. Remove everything else (pending, overdue, in_review).
        const newPayments = payments.filter(p => {
            if (p.studentId === studentId) {
                // Return true to KEEP, false to DELETE
                return p.status === 'paid';
            }
            return true; // Keep other students' records
        });

        // 7. Save All back to LocalStorage
        localStorage.setItem(STORAGE_KEYS.USERS_DB, JSON.stringify(newUsers));
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(newStudents));
        localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(newClasses));
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(newEvents));
        PulseService.savePayments(newPayments);

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
        
        // DATA NORMALIZATION: Ensure monetary values are numbers
        const sanitizedSettings = {
            ...settings,
            paymentSettings: {
                ...settings.paymentSettings,
                monthlyTuition: Number(settings.paymentSettings.monthlyTuition) || 0,
                lateFeeAmount: Number(settings.paymentSettings.lateFeeAmount) || 0,
                billingDay: Number(settings.paymentSettings.billingDay),
                lateFeeDay: Number(settings.paymentSettings.lateFeeDay)
            }
        };

        const index = academies.findIndex(a => a.id === sanitizedSettings.id);
        if (index >= 0) academies[index] = sanitizedSettings;
        else academies.push(sanitizedSettings);
        localStorage.setItem(STORAGE_KEYS.ACADEMIES, JSON.stringify(academies));
    },

    getStudents: (academyId?: string): Student[] => {
        const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
        let allStudents: Student[] = data ? JSON.parse(data) : mockStudents;
        
        // Normalize Balance
        allStudents = allStudents.map(s => ({
            ...s, 
            academyId: s.academyId || 'acad-1',
            balance: Number(s.balance) || 0
        }));
        
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
        events = events.map(e => ({
            ...e, 
            registrants: e.registrants || [], 
            academyId: e.academyId || 'acad-1',
            isVisibleToStudents: e.isVisibleToStudents !== undefined ? e.isVisibleToStudents : true // Default legacy to true
        }));
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

    getPayments: (academyId?: string): TuitionRecord[] => {
        const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
        let rawPayments: any[] = data ? JSON.parse(data) : [];
        
        // CRITICAL DATA SANITIZATION
        // Ensure numbers are Numbers and dates are handled safely
        const payments: TuitionRecord[] = rawPayments.map(p => ({
            ...p,
            academyId: p.academyId || 'acad-1',
            // Force number coercion to prevent string concatenation bugs
            amount: Number(p.amount) || 0,
            penaltyAmount: Number(p.penaltyAmount) || 0,
            originalAmount: p.originalAmount !== undefined ? Number(p.originalAmount) : undefined,
            declaredAmount: p.declaredAmount !== undefined ? Number(p.declaredAmount) : undefined,
            // Ensure PaymentDate is explicitly null if empty string/undefined, to match Typescript check logic
            paymentDate: p.paymentDate || null
        }));

        if (academyId) return payments.filter(p => p.academyId === academyId);
        return payments;
    },

    savePayments: (payments: TuitionRecord[]) => {
        // --- DATA INTEGRITY FIX ---
        // 1. Deduplication: Use a Map with ID as key to ensure we don't save duplicates.
        //    The last item in the array (most recent update) will overwrite previous ones.
        const uniqueMap = new Map<string, TuitionRecord>();
        
        payments.forEach(p => {
            // 2. Type Safety: Ensure all monetary fields are strictly numbers before saving to disk.
            // This prevents "500" + 50 = "50050" string concatenation bugs later.
            // FIX: Ensure originalAmount is preserved and not accidentally dropped or zeroed if valid
            const cleanRecord = {
                ...p,
                amount: Number(p.amount),
                penaltyAmount: Number(p.penaltyAmount || 0),
                originalAmount: p.originalAmount !== undefined ? Number(p.originalAmount) : undefined,
                declaredAmount: p.declaredAmount !== undefined ? Number(p.declaredAmount) : undefined,
            };
            uniqueMap.set(p.id, cleanRecord);
        });

        const uniquePayments = Array.from(uniqueMap.values());
        localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(uniquePayments));
    },

    updatePaymentRecord: (updatedRecord: TuitionRecord) => {
        const allRecords = PulseService.getPayments();
        const index = allRecords.findIndex(r => r.id === updatedRecord.id);

        if (index !== -1) {
            // Update existing record
            allRecords[index] = { ...allRecords[index], ...updatedRecord };
        } else {
            // Add new record if it somehow doesn't exist (safety fallback)
            allRecords.push(updatedRecord);
        }
        
        PulseService.savePayments(allRecords);
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
