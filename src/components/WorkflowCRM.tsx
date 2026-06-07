import React, { useState, useMemo } from 'react';
import type { Task, User, ImportProcess } from '../types';
import { TaskStatus, TaskPriority } from '../types';
import { Link } from 'react-router-dom';
import { Trello, CheckSquare, PlusCircle, Edit, Trash2, Filter, X, Circle, CircleDotDashed, CheckCircleIcon, ArrowUp, ArrowDown, Equal, AlertTriangle, Save, Clock, GripVertical, Paperclip, MessageSquare } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { useAppData, useAppActions, useUI } from '../context/AppContext';

const emptyTask: Omit<Task, 'id'> = {
    description: '',
    status: TaskStatus.Pending,
    priority: 'Medium',
    dueDate: undefined,
    assignedToId: undefined,
    linkedTo: undefined,
    comments: [],
    attachments: [],
    labels: []
};

const STATUSES: TaskStatus[] = [TaskStatus.Pending, TaskStatus.InProgress, TaskStatus.Completed, TaskStatus.Blocked];
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];

const PriorityIcon: React.FC<{priority: TaskPriority}> = ({priority}) => {
    switch (priority) {
        case 'High': return <span title="High Priority"><ArrowUp size={16} className="text-red-500" /></span>;
        case 'Medium': return <span title="Medium Priority"><Equal size={16} className="text-amber-500" /></span>;
        case 'Low': return <span title="Low Priority"><ArrowDown size={16} className="text-sky-500" /></span>;
        default: return null;
    }
};

const TaskCard: React.FC<{ task: Task & { assignee?: User }, onEdit: (task: Task) => void }> = ({ task, onEdit }) => {
    const isOverdue = task.status !== 'Completed' && task.dueDate && new Date(task.dueDate+'T00:00:00Z') < new Date();
    
    const priorityStyles: Record<TaskPriority, string> = {
        High: 'border-l-red-500',
        Medium: 'border-l-amber-500',
        Low: 'border-l-sky-500'
    };

    return (
        <div 
            onClick={() => onEdit(task)}
            className={`bg-white dark:bg-brand-primary p-3 rounded-md shadow-sm border-l-4 ${priorityStyles[task.priority]} cursor-pointer hover:shadow-lg hover:-translate-y-px transform transition-all group`}
        >
            <p className="font-medium text-brand-gray-500 dark:text-gray-200 mb-2 text-sm">{task.description}</p>
            
            {task.labels && task.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                    {task.labels.map(label => (
                        <span key={label} className="px-2 py-0.5 text-xs rounded-full bg-brand-highlight/20 text-brand-primary/80 dark:bg-brand-highlight/70 dark:text-brand-primary font-semibold">{label}</span>
                    ))}
                </div>
            )}

            <div className="flex items-center justify-between text-xs text-brand-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                    {task.dueDate && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-bold' : ''}`}>
                            <Clock size={12}/> {new Date(task.dueDate + 'T00:00:00Z').toLocaleDateString()}
                        </span>
                    )}
                     {task.comments && task.comments.length > 0 && <span className="flex items-center gap-1"><MessageSquare size={12} /> {task.comments.length}</span>}
                    {task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip size={12} /> {task.attachments.length}</span>}
                </div>
                <div className="flex items-center gap-2">
                    <PriorityIcon priority={task.priority} />
                    {task.assignee && (
                        <div className="w-6 h-6 rounded-full bg-brand-secondary text-white text-xs flex items-center justify-center border-2 border-white dark:border-brand-primary" title={task.assignee.name}>
                            {task.assignee.initials}
                        </div>
                    )}
                </div>
            </div>
            {task.linkedTo && <Link to={`/imports/${task.linkedTo.id}`} onClick={e => e.stopPropagation()} className="text-xs text-sky-600 dark:text-sky-400 hover:underline mt-2 block truncate">Ref: {task.linkedTo.name}</Link>}
        </div>
    );
};

const WorkflowCRM: React.FC = () => {
    const { tasks, users, imports } = useAppData();
    const { addTask: onAddTask, updateTask: onUpdateTask, deleteTask: onDeleteTask } = useAppActions();
    const { currentUser, showNotification } = useUI();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task> | null>(null);
    const [filters, setFilters] = useState({ assignedToId: 'all', priority: 'all' });

    const handleOpenForm = (task?: Task) => {
        setEditingTask(task ? { ...task } : { ...emptyTask });
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setEditingTask(null);
        setIsFormOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        if (!editingTask) return;
        const { name, value } = e.target;
        
        if (name === 'linkedToImport') {
            const selectedImport = imports.find(imp => imp.id === value);
            const linkedTo = selectedImport ? { type: 'Import' as const, id: selectedImport.id, name: selectedImport.importNumber } : undefined;
            setEditingTask(prev => ({ ...prev, linkedTo }));
        } else {
             setEditingTask(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async () => {
        if (!editingTask || !editingTask.description) return;
        const { id, ...newTaskData } = editingTask;

        const taskToSave: Omit<Task, 'id'> = {
            description: newTaskData.description!,
            status: newTaskData.status || TaskStatus.Pending,
            priority: newTaskData.priority || 'Medium',
            dueDate: newTaskData.dueDate,
            assignedToId: newTaskData.assignedToId,
            linkedTo: newTaskData.linkedTo,
            comments: newTaskData.comments || [],
            attachments: newTaskData.attachments || [],
            labels: newTaskData.labels || []
        };

        try {
            if (id) {
                await onUpdateTask({ id, ...taskToSave });
            } else {
                await onAddTask(taskToSave);
            }
            handleCloseForm();
        } catch(e) {
            showNotification('Failed to save task.', 'error');
        }
    };
    
    const handleDelete = async (taskId: string) => {
        const confirmed = await new Promise(resolve => {
            const modalRoot = document.createElement('div');
            document.body.appendChild(modalRoot);
            const root = createRoot(modalRoot);
            const cleanup = () => { root.unmount(); modalRoot.remove(); };

            const CustomConfirmModal: React.FC<{ onConfirm: () => void; onCancel: () => void; }> = ({ onConfirm, onCancel }) => (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-brand-secondary rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-gray-700"><h3 className="text-lg font-bold text-brand-primary dark:text-white">Confirm Deletion</h3></div>
                        <div className="p-6"><p className="text-gray-600 dark:text-gray-300">Are you sure you want to delete this task?</p></div>
                        <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={onCancel} className="px-4 py-2 border rounded-lg">Cancel</button>
                            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
                        </div>
                    </div>
                </div>
            );

            root.render(<CustomConfirmModal onConfirm={() => { resolve(true); cleanup(); }} onCancel={() => { resolve(false); cleanup(); }} />);
        });
        
        if(confirmed) {
            try {
                await onDeleteTask(taskId);
                handleCloseForm();
            } catch(e) {
                showNotification('Failed to delete task.', 'error');
            }
        }
    }

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const assignedMatch = filters.assignedToId === 'all' || task.assignedToId === filters.assignedToId;
            const priorityMatch = filters.priority === 'all' || task.priority === filters.priority;
            return assignedMatch && priorityMatch;
        }).map(task => ({
            ...task,
            assignee: users.find(u => u.id === task.assignedToId),
        }));
    }, [tasks, users, filters]);

    const FormModal = () => (
        isFormOpen && editingTask &&
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4" onClick={handleCloseForm}>
            <div className="bg-white dark:bg-brand-secondary rounded-lg shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-brand-gray-500 dark:text-white">{editingTask.id ? 'Edit Task' : 'Add New Task'}</h3>
                    {editingTask.id && (
                        <button onClick={() => handleDelete(editingTask.id!)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-md"><Trash2 size={18} /></button>
                    )}
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <textarea name="description" value={editingTask.description || ''} onChange={handleChange} rows={3} className="block w-full px-3 py-2 bg-white dark:bg-brand-primary border border-gray-300 dark:border-brand-accent rounded-md" placeholder="Task description..." required />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select name="status" value={editingTask.status || 'Pending'} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-sm">
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select name="priority" value={editingTask.priority || 'Medium'} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-sm">
                            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                         <input type="date" name="dueDate" value={editingTask.dueDate || ''} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-sm" />
                        <select name="assignedToId" value={editingTask.assignedToId || ''} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-sm">
                            <option value="">Unassigned</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                        <select name="linkedToImport" value={editingTask.linkedTo?.id || ''} onChange={handleChange} className="md:col-span-2 w-full p-2 border dark:border-brand-accent rounded-md bg-white dark:bg-brand-primary text-sm">
                            <option value="">No Link</option>
                            {imports.map(imp => <option key={imp.id} value={imp.id}>{imp.importNumber}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 flex justify-end gap-3">
                    <button onClick={handleCloseForm} type="button" className="px-4 py-2 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
                    <button onClick={handleSave} type="button" className="px-4 py-2 bg-brand-secondary text-white rounded-lg flex items-center gap-2 hover:bg-brand-accent"><Save size={16} /> Save Task</button>
                </div>
            </div>
        </div>
    );
    
    const KanbanBoard = () => {
        const columns = STATUSES.map(status => ({
            title: status,
            tasks: filteredTasks.filter(t => t.status === status)
        }));

        return (
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
                {columns.map(col => (
                    <div key={col.title} className="w-80 bg-gray-100 dark:bg-brand-secondary rounded-lg p-2 shrink-0 flex flex-col">
                        <h3 className="font-semibold text-brand-gray-500 dark:text-gray-200 p-2 uppercase text-sm tracking-wider">{col.title} ({col.tasks.length})</h3>
                        <div className="space-y-3 overflow-y-auto flex-grow p-1">
                            {col.tasks.map(task => (
                                <TaskCard key={task.id} task={task} onEdit={handleOpenForm} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    
    return (
        <>
            <FormModal />
            <div className="space-y-4 h-full flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-xl font-semibold text-brand-gray-500 dark:text-white flex items-center gap-2"><Trello /> Workflow / CRM</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-brand-primary rounded-lg">
                             <Filter size={14} className="mx-1" />
                             <select value={filters.assignedToId} onChange={e => setFilters(f => ({...f, assignedToId: e.target.value}))} className="bg-transparent text-sm dark:text-gray-200 border-0 focus:ring-0">
                                <option value="all">All Users</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                             </select>
                             <select value={filters.priority} onChange={e => setFilters(f => ({...f, priority: e.target.value}))} className="bg-transparent text-sm dark:text-gray-200 border-0 focus:ring-0">
                                <option value="all">All Priorities</option>
                                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                             </select>
                        </div>
                        <button onClick={() => handleOpenForm()} className="flex items-center gap-2 bg-brand-secondary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-accent">
                            <PlusCircle size={20} /> Add Task
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-hidden">
                    <KanbanBoard />
                </div>
            </div>
        </>
    );
};

export default WorkflowCRM;