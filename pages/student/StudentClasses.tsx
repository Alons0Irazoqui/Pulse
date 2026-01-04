
import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';

const StudentClasses: React.FC = () => {
  const { classes, students, currentUser } = useStore();
  const navigate = useNavigate();

  // Get current student
  const student = students.find(s => s.id === currentUser?.studentId);

  // Filter classes where the student is enrolled (using student.classesId)
  const myClasses = classes.filter(c => student?.classesId?.includes(c.id));

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-10 w-full">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-text-main">Mis Clases</h1>
            <p className="text-text-secondary mt-1">Gestiona tu horario y revisa tu rendimiento por clase.</p>
        </header>

        {myClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-gray-200 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="size-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-4xl text-gray-300">class</span>
                </div>
                <h3 className="text-xl font-bold text-text-main mb-2">No estás inscrito en ninguna clase</h3>
                <p className="text-text-secondary max-w-md">
                    Contacta a tu maestro para que te inscriba en un grupo o revisa el calendario de eventos.
                </p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {myClasses.map(cls => (
                    <div 
                        key={cls.id} 
                        className="bg-white rounded-[2rem] p-6 shadow-card border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group cursor-pointer relative overflow-hidden"
                        onClick={() => navigate(`/student/classes/${cls.id}`)}
                    >
                        {/* Decorative background element */}
                        <div className="absolute -right-4 -top-4 size-24 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full z-0 group-hover:scale-150 transition-transform duration-500"></div>

                        <div className="relative z-10">
                            <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-primary flex items-center justify-center shadow-sm mb-5">
                                <span className="material-symbols-outlined text-3xl">sports_martial_arts</span>
                            </div>
                            
                            <h3 className="text-2xl font-bold text-text-main mb-1 leading-tight">{cls.name}</h3>
                            <p className="text-xs text-text-secondary uppercase tracking-wider font-bold mb-6">Grupo Regular</p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm text-text-secondary bg-gray-50/50 p-3 rounded-xl">
                                    <span className="material-symbols-outlined text-[20px] text-gray-400">schedule</span>
                                    <span className="font-medium text-text-main">{cls.schedule}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-text-secondary bg-gray-50/50 p-3 rounded-xl">
                                    <span className="material-symbols-outlined text-[20px] text-gray-400">person</span>
                                    <span className="font-medium text-text-main">{cls.instructor}</span>
                                </div>
                            </div>

                            <button className="mt-6 w-full py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 group-hover:shadow-primary/20">
                                <span>Ver Detalles</span>
                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default StudentClasses;
