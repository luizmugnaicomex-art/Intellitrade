import React, { useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useUI } from '../context/AppContext';

const CompanyProfile: React.FC = () => {
    const { companyLogo, handleUpdateLogo } = useUI();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, SVG).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof e.target?.result === 'string') {
                handleUpdateLogo(e.target.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        handleUpdateLogo(null);
    };

    return (
        <div className="bg-white dark:bg-brand-secondary p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 border-b dark:border-gray-700 pb-3">Company Profile & Branding</h2>
            
            <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Company Logo</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">Upload your company logo. It will be displayed in the sidebar.</p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="w-48 h-24 bg-gray-100 dark:bg-brand-primary rounded-lg flex items-center justify-center border-2 border-dashed dark:border-gray-600 shrink-0">
                        {companyLogo ? (
                            <img src={companyLogo} alt="Company Logo" className="max-h-full max-w-full object-contain p-2" />
                        ) : (
                            <div className="text-gray-400 dark:text-gray-500 text-center">
                                <ImageIcon size={32} className="mx-auto" />
                                <p className="text-xs mt-1">No Logo</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/png, image/jpeg, image/svg+xml"
                        />
                        <button
                            onClick={handleLogoUploadClick}
                            className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent"
                        >
                            <UploadCloud size={18} /> Upload New Logo
                        </button>
                        {companyLogo && (
                             <button
                                onClick={handleRemoveLogo}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                            >
                                <Trash2 size={18} /> Remove Logo
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanyProfile;