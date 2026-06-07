
import React from 'react';
import { Brain, HardDrive } from 'lucide-react';

const MachineLearn = () => {
    return (
        <div className="bg-white dark:bg-brand-secondary p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold text-brand-primary dark:text-white mb-4 flex items-center gap-2">
                <Brain /> Machine Learn Module
            </h2>
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                    This module will house advanced machine learning models for predictive analytics, such as demand forecasting, automated anomaly detection, and cost optimization suggestions.
                </p>
                <div className="p-6 border-2 border-dashed dark:border-gray-600 rounded-lg text-center">
                    <HardDrive size={40} className="mx-auto text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-2 text-lg font-medium text-gray-800 dark:text-gray-200">Feature Coming Soon</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Our data science team is developing predictive models. This section will be activated once they are ready for integration.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MachineLearn;
