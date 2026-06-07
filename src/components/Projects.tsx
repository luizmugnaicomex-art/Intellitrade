

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Project, ProjectTask } from '../types';
import { GanttChart, PlusCircle, Edit, Trash2, Save, X } from 'lucide-react';
import { useAppData, useAppActions } from '../context/AppContext';

const GanttBar: React.FC<{ task: ProjectTask; projectStart: Date; totalDays: number; isTopLevel?: boolean }> = ({ task, projectStart, totalDays, isTopLevel }) => {
    const taskStart = new Date(task.start);
    const taskEnd = new Date(task.end);

    const startOffset = Math.max(0, (taskStart.getTime() - projectStart.getTime()) / (1000 * 3600 * 24));
    const duration = Math.max(1, (taskEnd.getTime() - taskStart.getTime()) / (1000 * 3600 * 24));

    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;

    return (
        <div className="absolute h-full top-0" style={{ left: `${left}%`, width: `${width}%` }}>
            <div className={`h-full rounded-md ${isTopLevel ? 'bg-sky-600' : 'bg-teal-500'} relative group`}>
                <div className="absolute top-0 left-0 h-full bg-black/30 rounded-md" style={{ width: `${task.progress}%` }}></div>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-xs font-bold truncate pr-2 group-hover:visible invisible">
                    {task.name} ({task.progress}%)
                </span>
            </div>
        </div>
    );
};

const ProjectForm: React.FC<{
    project: Partial<Project> | null;
    onSave: (project: Project) => void;
    onCancel: () => void;
}> = ({ project, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Project>>({ ...project });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        if (!formData.name || !formData.startDate || !formData.endDate) {
            alert("Project Name, Start Date, and End Date are required.");
            return;
        }
        onSave({
            id: formData.id || `proj-${Date.now()}`,
            name: formData.name,
            description: formData.description || '',
            startDate: formData.startDate,
            endDate: formData.endDate,
            tasks: formData.tasks || []
        });
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div className="bg-white dark:bg-brand-secondary rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 className="p-4 font-semibold text-lg text-brand-primary dark:text-white border-b dark:border-gray-700">{project?.id ? 'Edit' : 'Create'} Project</h3>
                <div className="p-4 space-y-4">
                    <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="Project Name" className="w-full p-2 border dark:border-brand-accent rounded" />
                    <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Project Description" className="w-full p-2 border dark:border-brand-accent rounded" />
                    <div className="grid grid-cols-2 gap-4">
                        <input name="startDate" type="date" value={formData.startDate || ''} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded" />
                        <input name="endDate" type="date" value={formData.endDate || ''} onChange={handleChange} className="w-full p-2 border dark:border-brand-accent rounded" />
                    </div>
                </div>
                <div className="p-4 flex justify-end gap-2 bg-gray-50 dark:bg-brand-primary/50 border-t dark:border-gray-700">
                    <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-brand-accent text-white rounded">Save</button>
                </div>
            </div>
        </div>
    );
};

const Projects: React.FC = () => {
    const { projects } = useAppData();
    const { setProjects } = useAppActions();
    
    const [selectedProject, setSelectedProject] = useState<Project | null>(projects[0] || null);
    const [editingProject, setEditingProject] = useState<Partial<Project> | null>(null);

    const projectStart = useMemo(() => selectedProject ? new Date(selectedProject.startDate) : new Date(), [selectedProject]);
    const projectEnd = useMemo(() => selectedProject ? new Date(selectedProject.endDate) : new Date(), [selectedProject]);
    const totalDays = useMemo(() => (projectEnd.getTime() - projectStart.getTime()) / (1000 * 3600 * 24) || 1, [projectStart, projectEnd]);

    const handleSaveProject = (projectToSave: Project) => {
        if (projectToSave.id && projects.some(p => p.id === projectToSave.id)) {
            setProjects(prev => prev.map(p => p.id === projectToSave.id ? projectToSave : p));
        } else {
            setProjects(prev => [...prev, projectToSave]);
        }
        setEditingProject(null);
    };

    return (
        <div className="bg-white dark:bg-brand-secondary p-4 sm:p-6 rounded-xl shadow-md space-y-4">
            {editingProject && <ProjectForm project={editingProject} onSave={handleSaveProject} onCancel={() => setEditingProject(null)} />}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-xl font-semibold text-brand-primary dark:text-white flex items-center gap-2">
                    <GanttChart /> Projects Management
                </h2>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedProject?.id || ''}
                        onChange={(e) => setSelectedProject(projects.find(p => p.id === e.target.value) || null)}
                        className="w-full md:w-64 p-2 border dark:border-brand-accent rounded-lg text-sm bg-white dark:bg-brand-primary dark:text-gray-200"
                    >
                        <option value="">-- Select a Project --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <button onClick={() => setEditingProject({})} className="p-2.5 bg-brand-secondary text-white rounded-lg hover:bg-brand-accent"><PlusCircle size={20} /></button>
                </div>
            </div>

            {selectedProject ? (
                <div className="space-y-4">
                    <div className="p-4 bg-gray-50 dark:bg-brand-primary/50 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-brand-secondary dark:text-white">{selectedProject.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedProject.description}</p>
                            </div>
                            <button onClick={() => setEditingProject(selectedProject)} className="p-2 text-sky-600 hover:text-sky-800"><Edit size={16}/></button>
                        </div>
                    </div>
                    
                    <div className="w-full overflow-x-auto">
                        <div className="min-w-[800px] space-y-2 py-4">
                            {/* Gantt Header (Months) */}
                            <div className="flex h-6">
                                {Array.from({ length: Math.ceil(totalDays / 30.44) }).map((_, i) => {
                                    const monthStart = new Date(projectStart);
                                    monthStart.setMonth(monthStart.getMonth() + i);
                                    return (
                                        <div key={i} className="text-xs text-center font-semibold text-gray-500 dark:text-gray-400 border-r dark:border-gray-600" style={{ width: `${(30.44 / totalDays) * 100}%` }}>
                                            {monthStart.toLocaleString('default', { month: 'short' })}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Project level bar */}
                            <div className="flex items-center h-10">
                                <div className="w-40 pr-2 font-semibold text-sm truncate">{selectedProject.name}</div>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-8 rounded-md relative">
                                    <GanttBar task={{ ...selectedProject, start: selectedProject.startDate, end: selectedProject.endDate, progress: 50, name: selectedProject.name }} projectStart={projectStart} totalDays={totalDays} isTopLevel />
                                </div>
                            </div>
                            {/* Task level bars */}
                            {selectedProject.tasks.map(task => (
                                <div key={task.id} className="flex items-center h-8">
                                    <div className="w-40 pl-4 pr-2 text-xs text-gray-600 dark:text-gray-300 truncate">{task.name}</div>
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-6 rounded-md relative">
                                        <GanttBar task={task} projectStart={projectStart} totalDays={totalDays} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    Select a project to view its Gantt chart or create a new one.
                </div>
            )}
        </div>
    );
};

export default Projects;