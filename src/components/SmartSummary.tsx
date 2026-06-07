import React, { useState } from 'react';
import { Sparkles, BrainCircuit, Loader, AlertTriangle } from 'lucide-react';
import { geminiGenerateSmartSummary } from '../services/geminiService';
import { useAppData } from '../context/AppContext';

const SmartSummary: React.FC = () => {
    const { imports, claims, tasks } = useAppData();
    const [summary, setSummary] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateSummary = async () => {
        setIsLoading(true);
        setError(null);
        setSummary('');
        try {
            const result = await geminiGenerateSmartSummary(imports, claims, tasks);
            setSummary(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // A simple markdown to HTML converter
    const renderMarkdown = (text: string) => {
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\n\s*-\s/g, '</li><li class="mt-1">') // List items
            .replace(/\n/g, '<br />'); // Newlines
        
        return `<ul class="list-disc list-inside">${html.startsWith('</li>') ? html.substring(5) : `<li>${html}</li>`}</ul>`;
    }

    return (
        <div className="bg-white dark:bg-brand-secondary p-6 rounded-xl shadow-md space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-brand-gray-500 dark:text-white flex items-center gap-2">
                    <Sparkles /> AI Smart Summary
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Get an AI-generated overview of your current operations, highlighting key areas that need attention.
                </p>
            </div>

            <button
                onClick={handleGenerateSummary}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-brand-highlight text-brand-primary px-4 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-wait"
            >
                {isLoading ? (
                    <Loader size={20} className="animate-spin" />
                ) : (
                    <BrainCircuit size={20} />
                )}
                {isLoading ? 'Generating Summary...' : 'Generate Daily Briefing'}
            </button>
            
            {error && (
                 <div className="p-4 bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-700 text-red-800 dark:text-red-300 rounded-lg flex items-center gap-3">
                    <AlertTriangle size={20} />
                    <div>
                        <p className="font-semibold">Error Generating Summary</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            {summary && !isLoading && (
                 <div className="prose prose-sm dark:prose-invert max-w-none p-4 border dark:border-brand-accent rounded-lg bg-gray-50 dark:bg-brand-primary/50">
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(summary) }} />
                </div>
            )}
        </div>
    );
};

export default SmartSummary;