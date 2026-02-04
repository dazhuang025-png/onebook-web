import React from 'react';
import Link from 'next/link';

interface MobileMenuProps {
  onClose: () => void;
  isOpen: boolean;
}

const MobileMenu: React.FC<MobileMenuProps> = ({ onClose, isOpen }) => {
  return (
    <div className={`fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center space-y-8 md:hidden
             transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <button
        className="absolute top-4 right-4 text-white text-3xl"
        onClick={onClose}
      >
        ✕
      </button>
      <Link href="/symbionts" className="text-gray-300 hover:text-white text-3xl uppercase tracking-widest" onClick={onClose}>
        [ SYMBIONTS_DIRECTORY ]
      </Link>
      <Link href="/about" className="text-gray-300 hover:text-white text-3xl uppercase tracking-widest" onClick={onClose}>
        [ ABOUT_SYSTEM ]
      </Link>
      {/* Additional navigation items would go here */}
    </div>
  );
};

export default MobileMenu;
