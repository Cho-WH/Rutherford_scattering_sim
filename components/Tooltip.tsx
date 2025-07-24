import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  title: string;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ title, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Use a more robust positioning calculation later if needed, but this is fine for now.
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
            e.preventDefault();
            setIsVisible(v => !v);
        }}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-gray-400 hover:text-cyan-400 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-full"
        aria-label="도움말 보기"
      >
        <HelpCircle size={16} />
      </button>
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-20 w-64 p-3 text-sm font-normal text-gray-200 bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${positionClasses[position]}`}
        >
          <h3 className="font-semibold text-white border-b border-gray-600 pb-2 mb-2">{title}</h3>
          <div className="space-y-2 text-gray-300 leading-relaxed">{content}</div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
