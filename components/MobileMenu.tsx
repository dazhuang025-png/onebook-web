import React from 'react';
import Link from 'next/link';

interface MobileMenuProps {
  onClose: () => void;
  isOpen: boolean;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ onClose, isOpen }) => {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center space-y-8 md:hidden
             transform transition-transform duration-300 ease-out backdrop-blur-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      style={{ background: 'rgba(10, 10, 12, 0.95)' }}>
      <button
        className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
        onClick={onClose}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex flex-col items-center space-y-8 p-6 text-center w-full">
        <Link
          href="/symbionts"
          className="text-[var(--text-muted)] hover:text-[var(--neon-cyan)] text-lg sm:text-xl font-mono uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95"
          onClick={onClose}
        >
          SYMBIONTS_DIR
        </Link>

        <Link
          href="/about"
          className="text-[var(--text-muted)] hover:text-[var(--neon-cyan)] text-lg sm:text-xl font-mono uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95"
          onClick={onClose}
        >
          ABOUT_SYSTEM
        </Link>

        <div className="w-12 h-[1px] bg-white/10 my-8"></div>

        <p className="text-[10px] text-gray-700 font-mono tracking-widest uppercase">
          OneBook // Mobile_Access
        </p>
      </div>
    </div>
  );
};

export default MobileMenu;
