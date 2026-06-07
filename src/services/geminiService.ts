// src/services/geminiService.ts

import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { ImportProcess, Claim, Task } from '../types';
import { ImportStatus, TaskStatus } from '../types';
import { isPast, differenceInDays } from 'date-fns';

function getAiClient(): GoogleGenAI {
    const meta = import.meta as any;
    const apiKey = (meta?.env?.VITE_API_KEY as string) || 
                   (meta?.env?.VITE_GEMINI_API_KEY as string) || 
                   (typeof process !== 'undefined' ? (process.env?.API_KEY || process.env?.GEMINI_API_KEY) : undefined);
    
    if (!apiKey) {
        throw new Error("Unable to initialize Gemini API: An API Key must be configured. Please set your API Key in your workspace settings.");
    }
    return new GoogleGenAI({ apiKey });
}

// Function to generate a smart summary using Gemini
export async function geminiGenerateSmartSummary(
    imports: ImportProcess[],
    claims: Claim[],
    tasks: Task[]
): Promise<string> {
    
    // --- Data Distillation for a concise prompt ---
    const today = new Date();
    today.setHours(0,0,0,0);

    const keyMetrics = {
        totalImports: imports.length,
        importsInProgress: imports.filter(i => i.overallStatus !== ImportStatus.Delivered).length,
        totalClaims: claims.length,
        openClaims: claims.filter(c => c.status === 'Open' || c.status === 'In Progress').length,
        totalTasks: tasks.length,
        overdueTasks: tasks.filter(t => t.status !== TaskStatus.Completed && t.dueDate && isPast(new Date(t.dueDate))).length,
        demurrageRiskImports: imports.filter(imp => 
            imp.containers?.some(c => {
                if (!c.seaportArrivalDate) return false;
                const arrivalDate = new Date(c.seaportArrivalDate);
                const freeTimeEndDate = new Date(arrivalDate.setDate(arrivalDate.getDate() + (c.demurrageFreeDays || 0)));
                return differenceInDays(freeTimeEndDate, today) <= 7;
            })
        ).length,
    };

    const recentActivity = {
        recentImports: imports.slice(0, 3).map(i => ({ importNumber: i.importNumber, status: i.overallStatus, supplier: i.supplier })),
        recentClaims: claims.slice(0, 3).map(c => ({ blNumber: c.blNumber, status: c.status, description: c.description.substring(0, 50) })),
        upcomingTasks: tasks.filter(t => t.status !== TaskStatus.Completed && t.dueDate && !isPast(new Date(t.dueDate))).slice(0, 3).map(t => ({ description: t.description, dueDate: t.dueDate }))
    };
    
    const prompt = `
        You are an AI assistant for a foreign trade management system called IntelliTrade BR. 
        Your task is to provide a concise and actionable "Daily Briefing" for a manager based on the following operational data.
        Use markdown for formatting, with bolding for emphasis (**bold**) and bullet points (-).

        **Key Metrics:**
        - Total Imports: ${keyMetrics.totalImports} (${keyMetrics.importsInProgress} in progress)
        - Active Claims: ${keyMetrics.openClaims} of ${keyMetrics.totalClaims} total
        - Tasks: ${keyMetrics.totalTasks}, with ${keyMetrics.overdueTasks} overdue.
        - Imports at Demurrage Risk (within 7 days): ${keyMetrics.demurrageRiskImports}

        **Recent Activity (Examples):**
        - Recent Imports: ${JSON.stringify(recentActivity.recentImports)}
        - Recent Claims: ${JSON.stringify(recentActivity.recentClaims)}
        - Upcoming Tasks: ${JSON.stringify(recentActivity.upcomingTasks)}

        **Instructions:**
        1. Start with a brief, high-level overview.
        2. Create a section for "Urgent Actions" highlighting overdue tasks, high-risk demurrage, and open claims.
        3. Create a "General Status" section for non-urgent updates.
        4. Keep the summary professional, clear, and to the point. Focus on what a manager needs to know to take action.
        5. Do not invent data. Base your summary strictly on the provided metrics and examples.
    `;

    try {
        const ai = getAiClient();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const summaryText = response.text;
        if (!summaryText) {
            throw new Error("The AI model returned an empty summary.");
        }
        
        return summaryText;

    } catch (error) {
        console.error("Error generating smart summary with Gemini:", error);
        // Provide a more user-friendly error message
        if (error instanceof Error && error.message.includes('API key not valid')) {
             throw new Error("Could not generate summary: The Gemini API key is invalid or missing. Please contact an administrator.");
        }
        throw new Error("An error occurred while communicating with the AI model. Please try again later.");
    }
}
