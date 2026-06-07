// src/components/import-detail/TrackingSection.tsx

import React from 'react';
import { Truck } from 'lucide-react';
import { format } from 'date-fns';
import type { TrackingEvent } from '../../types';

interface TrackingSectionProps {
    trackingHistory: TrackingEvent[];
}

const TrackingSection: React.FC<TrackingSectionProps> = ({ trackingHistory }) => (
    <div className="lg:col-span-2">
        <h3 className="text-lg font-semibold text-brand-primary dark:text-white mb-3 flex items-center gap-2"><Truck size={20} /> Tracking History</h3>
        {trackingHistory && trackingHistory.length > 0 ? (
             <div className="border-l-2 border-brand-accent pl-6 relative">
                {trackingHistory.slice().reverse().map((event, index) => (
                    <div key={index} className="mb-6 relative">
                         <div className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full ${index === 0 ? 'bg-brand-highlight ring-4 ring-brand-highlight/30' : 'bg-brand-accent'}`}></div>
                         <p className={`font-semibold ${index === 0 ? 'text-brand-primary dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{event.stage}</p>
                         <p className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(event.date), 'PPP p')}</p>
                         {event.notes && <p className="text-sm mt-1 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-brand-primary/50 p-2 rounded-md">{event.notes}</p>}
                    </div>
                ))}
            </div>
        ) : (
             <div className="text-center p-8 text-gray-500 dark:text-gray-400 border border-dashed dark:border-gray-600 rounded-lg">
                No tracking events have been recorded.
            </div>
        )}
    </div>
);

export default TrackingSection;
