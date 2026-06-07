import React, { useState, useMemo } from 'react';
import { CalendarClock, Plus, X, Truck, XCircle, LogIn, Edit, Save } from 'lucide-react';
import type { DeliverySlot, ImportProcess, Container } from '../types';
import { format, addMinutes, isBefore } from 'date-fns';
import { Link } from 'react-router-dom';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAppData, useAppActions } from '../context/AppContext';

const TOTAL_DOCKS = 15;
const initialDockNames = Array.from({ length: TOTAL_DOCKS }, (_, i) => `Dock ${i + 1}`);

const generateTimeSlots = (date: Date): Date[] => {
    const slots = [];
    let currentTime = new Date(date);
    currentTime.setHours(0, 0, 0, 0);

    for (let i = 0; i < 48; i++) { // 48 slots of 30 minutes in a day
        slots.push(new Date(currentTime));
        currentTime = addMinutes(currentTime, 30);
    }
    return slots;
};

const BookingModal: React.FC<{
    slot: { dockId: number, time: Date },
    onClose: () => void,
    onBook: (bookingDetails: { containerNumber: string, importId?: string, containerId?: string }) => void,
    allContainers: (Container & { importNumber: string, importId: string })[]
}> = ({ slot, onClose, onBook, allContainers }) => {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<(Container & { importNumber: string, importId: string })[]>([]);
    const [selectedContainerInfo, setSelectedContainerInfo] = useState<{ containerId: string, importId: string } | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        setSelectedContainerInfo(null);
        if (value.length > 1) {
            const filtered = allContainers.filter(c => 
                c.containerNumber.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(filtered);
        } else {
            setSuggestions([]);
        }
    };

    const handleSuggestionClick = (container: (Container & { importNumber: string, importId: string })) => {
        setInputValue(container.containerNumber);
        setSelectedContainerInfo({ containerId: container.id, importId: container.importId });
        setSuggestions([]);
    };
    
    const handleBooking = () => {
        if (!inputValue.trim()) {
            alert("Please enter a container number.");
            return;
        }

        const exactMatch = allContainers.find(c => c.containerNumber.toLowerCase() === inputValue.trim().toLowerCase());
        
        if (exactMatch) {
            // Found an existing container, book with full details
            onBook({
                containerNumber: exactMatch.containerNumber,
                importId: exactMatch.importId,
                containerId: exactMatch.id
            });
        } else {
            // New, unlinked container
            onBook({
                containerNumber: inputValue.trim()
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-brand-secondary rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-brand-primary dark:text-white">Book Delivery Slot</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-brand-accent"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        You are booking <span className="font-semibold">Dock {slot.dockId}</span> for <span className="font-semibold">{format(slot.time, 'PPP p')}</span>.
                    </p>
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enter Container Number</label>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md shadow-sm focus:outline-none focus:ring-brand-accent sm:text-sm text-gray-900 dark:text-gray-200"
                            placeholder="Type to search or add new..."
                        />
                        {suggestions.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white dark:bg-brand-primary border dark:border-brand-accent rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                {suggestions.map(c => (
                                    <li 
                                        key={c.id} 
                                        onClick={() => handleSuggestionClick(c)}
                                        className="px-3 py-2 cursor-pointer hover:bg-brand-highlight dark:hover:bg-brand-accent text-sm text-gray-900 dark:text-gray-200"
                                    >
                                        {c.containerNumber} ({c.importNumber})
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3">
                    <button onClick={onClose} type="button" className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-brand-accent">Cancel</button>
                    <button onClick={handleBooking} disabled={!inputValue.trim()} type="button" className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent disabled:opacity-50">
                        <LogIn size={16} /> Confirm Booking
                    </button>
                </div>
            </div>
        </div>
    );
};

const ContainerDeliveryWindow: React.FC = () => {
    const { imports, deliverySchedule: schedule } = useAppData();
    const { addDeliverySlot: onAddSlot, deleteDeliverySlot: onDeleteSlot } = useAppActions();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedDock, setSelectedDock] = useState(1);
    const [bookingSlot, setBookingSlot] = useState<{ dockId: number, time: Date } | null>(null);
    const [dockNames, setDockNames] = useLocalStorage<string[]>('dockNames', initialDockNames);
    const [isEditingDocks, setIsEditingDocks] = useState(false);
    const [tempDockNames, setTempDockNames] = useState(dockNames);

    const timeSlots = useMemo(() => generateTimeSlots(selectedDate), [selectedDate]);

    const bookingsForDock = useMemo(() => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        return schedule.filter(slot => 
            slot.dockId === selectedDock &&
            format(new Date(slot.startTime), 'yyyy-MM-dd') === dateStr
        );
    }, [schedule, selectedDate, selectedDock]);
    
    const getSlotInfo = (time: Date) => {
        const booking = bookingsForDock.find(b => new Date(b.startTime).getTime() === time.getTime());
        if (!booking) return null;

        if (booking.importId) { // If it's a linked booking
            const imp = imports.find(i => i.id === booking.importId);
            const cont = imp?.containers.find(c => c.id === booking.containerId);
            return { booking, import: imp, container: cont, isLinked: true };
        }
        
        // Unlinked booking
        return { booking, import: undefined, container: undefined, isLinked: false };
    };
    
    const allContainers = useMemo(() => {
       return imports.flatMap(imp => 
            imp.containers.map(c => ({...c, importNumber: imp.importNumber, importId: imp.id}))
       );
    }, [imports]);

    const handleBookSlot = (bookingDetails: { containerNumber: string, importId?: string, containerId?: string }) => {
        if (!bookingSlot) return;
        const newSlot: Omit<DeliverySlot, 'id'> = {
            dockId: bookingSlot.dockId,
            startTime: bookingSlot.time.toISOString(),
            endTime: addMinutes(bookingSlot.time, 30).toISOString(),
            containerNumber: bookingDetails.containerNumber,
            importId: bookingDetails.importId,
            containerId: bookingDetails.containerId,
            receiptConfirmed: false,
        };
        onAddSlot(newSlot);
        setBookingSlot(null);
    };

    const handleSaveDockNames = () => {
        setDockNames(tempDockNames);
        setIsEditingDocks(false);
    };

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md h-full flex flex-col">
            {bookingSlot && <BookingModal slot={bookingSlot} onClose={() => setBookingSlot(null)} onBook={handleBookSlot} allContainers={allContainers} />}
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
                <div className="flex items-center">
                    <CalendarClock size={24} className="text-brand-accent" />
                    <h2 className="text-xl font-semibold text-brand-primary dark:text-white ml-3">Container Delivery Schedule</h2>
                </div>
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</label>
                    <input
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={e => setSelectedDate(new Date(new Date(e.target.value).valueOf() + new Date().getTimezoneOffset() * 60 * 1000))}
                        className="p-1 border dark:border-brand-accent rounded-md text-sm bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                    />
                </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Dock:</label>
                <select 
                    value={selectedDock} 
                    onChange={e => setSelectedDock(Number(e.target.value))}
                    className="p-2 border dark:border-brand-accent rounded-lg text-sm bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                >
                    {dockNames.map((dockName, i) => (
                        <option key={i + 1} value={i + 1}>{dockName}</option>
                    ))}
                </select>
                <button onClick={() => setIsEditingDocks(!isEditingDocks)} className="flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-brand-primary">
                    <Edit size={14}/> {isEditingDocks ? 'Cancel' : 'Edit Dock Names'}
                </button>
            </div>
            
            {isEditingDocks && (
                <div className="mb-4 p-4 border dark:border-brand-accent rounded-lg animate-fade-in-down">
                     <h4 className="font-semibold text-brand-primary dark:text-white mb-2">Editing Dock Names</h4>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {tempDockNames.map((name, index) => (
                            <input
                                key={index}
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    const newNames = [...tempDockNames];
                                    newNames[index] = e.target.value;
                                    setTempDockNames(newNames);
                                }}
                                className="p-1.5 border dark:border-brand-accent rounded-md text-sm bg-white dark:bg-brand-primary text-gray-900 dark:text-gray-200"
                            />
                        ))}
                     </div>
                     <button onClick={handleSaveDockNames} className="mt-4 flex items-center gap-2 bg-emerald-600 text-white px-3 py-1.5 text-sm font-semibold rounded-lg hover:bg-emerald-700">
                        <Save size={16}/> Save Names
                     </button>
                </div>
            )}

            <div className="flex-grow overflow-y-auto pr-2">
                <div className="grid grid-cols-1 gap-1">
                    {timeSlots.map(time => {
                        const slotInfo = getSlotInfo(time);
                        const isPast = isBefore(time, new Date()) && !slotInfo;

                        if (slotInfo) {
                            return (
                                <div key={time.toISOString()} className="h-14 bg-brand-primary/80 dark:bg-brand-accent/70 border-l-4 border-brand-highlight dark:border-amber-400 rounded-r-lg p-2 flex justify-between items-center">
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold text-white truncate">{slotInfo.booking.containerNumber}</p>
                                        {slotInfo.isLinked && slotInfo.import ? (
                                            <Link to={`/imports/${slotInfo.import.id}`} className="text-xs text-gray-200 hover:underline truncate block">
                                                {slotInfo.import.importNumber}
                                            </Link>
                                        ) : (
                                            <p className="text-xs text-amber-200 truncate block">Unlinked Container</p>
                                        )}
                                    </div>
                                    <div className="text-right text-white ml-2">
                                        <p className="text-sm font-semibold">{format(time, 'HH:mm')}</p>
                                        <button onClick={() => onDeleteSlot(slotInfo.booking.id)} className="p-1 text-red-200 hover:text-white">
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                             <div key={time.toISOString()} className={`h-12 border-b dark:border-gray-700 flex items-center justify-between px-2 group transition-colors ${isPast ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-sky-50 dark:hover:bg-sky-900/50'}`}>
                                <span className={`text-sm ${isPast ? 'text-gray-400 dark:text-gray-600' : 'text-gray-600 dark:text-gray-400'}`}>
                                    {format(time, 'HH:mm')}
                                </span>
                                {!isPast && (
                                    <button
                                        onClick={() => setBookingSlot({ dockId: selectedDock, time })}
                                        className="p-1.5 rounded-full text-sky-600 dark:text-sky-400 bg-sky-100/0 dark:bg-sky-900/0 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Plus size={16} />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ContainerDeliveryWindow;