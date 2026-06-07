

import React from 'react';
import type { User } from '../types';
import { Sun, Moon } from 'lucide-react';
import { useUI, useAppData } from '../context/AppContext';

const LoginScreen: React.FC = () => {
    const { theme, setTheme, companyLogo, login } = useUI();
    const { users } = useAppData();
    
    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <div className={`min-h-screen ${theme === 'light' ? 'bg-brand-light' : 'bg-brand-primary'} flex flex-col items-center justify-center p-4 relative transition-colors duration-300`}>
            <div className="absolute top-4 right-4 flex items-center gap-4">
                 <button 
                    onClick={toggleTheme}
                    className="p-3 rounded-full text-brand-highlight bg-white dark:bg-brand-secondary hover:bg-gray-200 dark:hover:bg-brand-accent transition-colors shadow-md"
                    aria-label="Toggle theme"
                >
                    {theme === 'light' ? <Moon size={20} className="text-brand-gray-500" /> : <Sun size={20} />}
                </button>
            </div>
            
            {companyLogo ? (
                 <img src={companyLogo} alt="Company Logo" className="max-h-20 mb-6" />
            ) : (
                <h1 className={`text-4xl font-bold ${theme === 'light' ? 'text-brand-gray-500' : 'text-white'} mb-2`}>IntelliTrade BR</h1>
            )}

            <p className={`text-lg ${theme === 'light' ? 'text-brand-gray-500' : 'text-brand-light'} mb-12`}>Select a user profile to continue</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-4xl">
                {users.map(user => (
                    <button 
                        key={user.id} 
                        onClick={() => login(user)}
                        className="bg-white dark:bg-brand-secondary rounded-xl shadow-lg p-6 text-center group hover:bg-brand-highlight dark:hover:bg-brand-highlight transform hover:-translate-y-1 transition-all duration-200"
                    >
                        <div className="w-20 h-20 rounded-full bg-brand-secondary dark:bg-brand-primary text-white text-3xl font-bold flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-primary dark:group-hover:bg-brand-secondary group-hover:text-white">
                            {user.initials}
                        </div>
                        <h2 className="text-xl font-semibold text-brand-gray-500 dark:text-white group-hover:text-black">{user.name}</h2>
                        <p className="text-brand-gray-500 dark:text-gray-400 group-hover:text-brand-primary">{user.role}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LoginScreen;