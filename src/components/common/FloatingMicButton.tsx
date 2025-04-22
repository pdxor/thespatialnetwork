import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import UniversalVoiceInput from './UniversalVoiceInput';
import { useLocation } from 'react-router-dom';

interface FloatingMicButtonProps {
  currentProject?: { id: string; title: string } | null;
}

const FloatingMicButton: React.FC<FloatingMicButtonProps> = ({ currentProject }) => {
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const location = useLocation();

  // Don't show on login/register pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowVoiceInput(true)}
        className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:from-purple-700 hover:to-indigo-700 dark:hover:from-purple-600 dark:hover:to-indigo-600"
        aria-label="Voice Input"
      >
        <Mic className="h-6 w-6" />
      </button>

      {showVoiceInput && (
        <UniversalVoiceInput 
          onClose={() => setShowVoiceInput(false)} 
          currentProject={currentProject}
        />
      )}
    </>
  );
};

export default FloatingMicButton;