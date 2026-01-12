import React from 'react';
import { motion } from 'framer-motion';

// Fix for type errors with motion components
const MotionDiv = motion.div as any;

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'inbox', title, description, action }) => {
  return (
    <MotionDiv 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-24 px-6 text-center h-full w-full"
    >
      <div className="size-24 bg-zinc-900/50 rounded-3xl flex items-center justify-center mb-6 border border-zinc-800 shadow-inner group">
        <span className="material-symbols-outlined text-5xl text-zinc-700 group-hover:text-zinc-600 transition-colors duration-500">{icon}</span>
      </div>
      
      <h3 className="text-lg font-bold text-zinc-300 mb-2 tracking-tight">{title}</h3>
      <p className="text-zinc-500 text-sm max-w-xs mb-8 leading-relaxed font-medium">
        {description}
      </p>
      
      {action && (
        <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {action}
        </div>
      )}
    </MotionDiv>
  );
};

export default EmptyState;