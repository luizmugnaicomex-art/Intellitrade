// src/services/vesselScheduleService.ts

import type { VesselScheduleEntry } from '../types';

/**
 * Helper function to normalize date/time strings to ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ).
 * Handles various formats including 'DD/MM/YYYY HH:mm'.
 * @param dateTimeStr The date/time string to normalize.
 * @returns Normalized ISO datetime string or empty string if invalid.
 */
const normalizeDateTime = (dateTimeStr: string): string => {
    if (!dateTimeStr || dateTimeStr.trim().length < 10) return ''; // Minimum length for DD/MM/YYYY HH:mm

    try {
        // Try parsing as 'DD/MM/YYYY HH:mm'
        const parts = dateTimeStr.split(' ');
        if (parts.length === 2) {
            const dateParts = parts[0].split('/');
            const timeParts = parts[1].split(':');
            if (dateParts.length === 3 && timeParts.length === 2) {
                const year = parseInt(dateParts[2], 10);
                const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
                const day = parseInt(dateParts[0], 10);
                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);

                const d = new Date(year, month, day, hours, minutes);
                if (!isNaN(d.getTime())) {
                    return d.toISOString(); // Return ISO string if valid
                }
            }
        }
        // Fallback to standard Date parsing for other formats
        const d = new Date(dateTimeStr);
        if (!isNaN(d.getTime())) return d.toISOString();
        return ''; // Return empty string for invalid date
    } catch (e) {
        console.warn(`[VesselScheduleService Debug] Error parsing date/time "${dateTimeStr}":`, e);
        return ''; // Return empty string on error
    }
};

/**
 * Maps a single row from the vessel schedule spreadsheet to a VesselScheduleEntry object.
 * Assumes column headers are normalized (lowercase, trimmed).
 *
 * @param row The row object from the parsed CSV/Excel.
 * @returns A VesselScheduleEntry object with extracted data.
 */
const mapRowToVesselScheduleEntry = (row: Record<string, any>): VesselScheduleEntry => {
    // Normalize keys to lowercase, trim, and remove quotes for robust matching against headers
    const normalizedRow: Record<string, any> = {};
    for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
            // Ensure values are also trimmed and quotes removed from start/end
            normalizedRow[key.toLowerCase().trim().replace(/"/g, '')] = (row[key] || '').toString().trim().replace(/^"|"$/g, '');
        }
    }

    // Extracting data based on observed headers from "ProgramacaoDeNavios.xlsx - Sheet1.csv"
    // Headers are mixed English/Portuguese, so we use the exact normalized keys from the sheet.
    const vesselVoyageCombined = normalizedRow['navio / viagem'] || '';
    let vesselName = vesselVoyageCombined;
    let voyage = vesselVoyageCombined;

    // Attempt to split "Vessel Name / Voyage Number" if present
    const splitVesselVoyage = vesselVoyageCombined.split(','); // Some sheets might use comma to separate
    if (splitVesselVoyage.length > 1) {
        vesselName = splitVesselVoyage[0].trim();
        voyage = splitVesselVoyage[1].trim();
    } else {
        const spaceSplit = vesselVoyageCombined.split(' '); // Try splitting by space if it's "VESSELNAME VOYAGE"
        if (spaceSplit.length > 1) {
            vesselName = spaceSplit.slice(0, -1).join(' ').trim();
            voyage = spaceSplit[spaceSplit.length - 1].trim();
        }
    }

    const agency = normalizedRow['armador'] || ''; // "Armador"
    const berth = normalizedRow['berço'] || ''; // "Berço"
    const status = (normalizedRow['situação'] || 'Expected').toString().trim(); // "Situação"
    const cargo = (normalizedRow['tipo'] || 'Containers').toString().trim(); // "Tipo" - e.g., Longo Curso, Cabotagem

    return {
        vesselName: vesselName,
        voyage: voyage,
        agency: agency,
        // Use normalized names for ETA/ETB/ETS columns
        eta: normalizeDateTime(normalizedRow['estimativa chegada eta'] || normalizedRow['eta'] || ''),
        etb: normalizeDateTime(normalizedRow['estimativa atracação etb'] || normalizedRow['etb'] || ''),
        ets: normalizeDateTime(normalizedRow['estimativa saída etd'] || normalizedRow['etd'] || ''),
        berth: berth,
        status: (status === 'Programado' || status === 'Expected') ? 'Expected' : 'Berthed', // Map to our enum
        cargo: cargo,
    };
};

/**
 * Processes raw CSV/Excel content to extract an array of VesselScheduleEntry objects.
 * This function handles basic CSV/TSV parsing and maps rows to the defined structure.
 *
 * @param fileContent The raw text content of the CSV or converted Excel sheet.
 * @returns A Promise resolving to an array of VesselScheduleEntry objects.
 */
export async function processVesselScheduleFile(fileContent: string): Promise<VesselScheduleEntry[]> {
    if (!fileContent) {
        console.warn("[VesselScheduleService Debug] File content is empty.");
        return [];
    }

    console.log("[VesselScheduleService Debug] Raw fileContent received (first 500 chars):\n", fileContent.substring(0, 500) + '...');

    // Remove Byte Order Mark (BOM) if present
    const cleanText = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.substring(1) : fileContent;
    const lines = cleanText.split(/\r\n|\n/).filter(line => line.trim() !== '');
    
    if (lines.length <= 1) { // Need at least header and one data row
        console.warn("[VesselScheduleService Debug] Not enough lines after splitting. Lines count:", lines.length);
        return [];
    }

    console.log("[VesselScheduleService Debug] First 5 lines after splitting:\n", lines.slice(0, 5).join('\n'));

    // Determine delimiter: check if the first line contains a tab
    let delimiter = ',';
    if (lines[0].includes('\t') && !lines[0].includes(',')) { // Prefer tab if present and no commas
        delimiter = '\t';
    } else if (lines[0].includes(',')) {
        delimiter = ',';
    }
    console.log(`[VesselScheduleService Debug] Detected delimiter: '${delimiter}'`);

    // --- NEW: Robust line parsing function to handle quoted fields ---
    const parseLineValuesRobustly = (line: string, delim: string): string[] => {
        const values: string[] = [];
        let inQuotes = false;
        let currentField = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                // Handle escaped quote (double quote inside a quoted field)
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    currentField += '"';
                    i++; // Skip the next quote
                } else {
                    inQuotes = !inQuotes; // Toggle quote state
                }
            } else if (char === delim && !inQuotes) {
                values.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        values.push(currentField); // Add the last field

        // Trim each value and remove leading/trailing quotes if they were not part of escaping
        return values.map(v => v.trim().replace(/^"|"$/g, ''));
    };
    
    // Parse headers from the first line using the robust parser
    const rawHeaders = parseLineValuesRobustly(lines[0], delimiter);
    const headers = rawHeaders.map(h => h.toLowerCase().trim().replace(/"/g, '')); // Cleaned headers for mapping
    console.log("[VesselScheduleService Debug] Parsed Headers (cleaned for mapping):", headers);
    console.log("[VesselScheduleService Debug] Original Headers (for reference):", rawHeaders);


    const vesselEntries: VesselScheduleEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
        const values = parseLineValuesRobustly(lines[i], delimiter); // Use robust parser for values
        
        if (values.length !== headers.length) {
            console.warn(`[VesselScheduleService Debug] Skipping row ${i + 1} due to column count mismatch. Expected ${headers.length}, got ${values.length}. Line: "${lines[i]}"`);
            continue;
        }

        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
            if (header) { // Only assign if header is not empty
                row[header] = values[index] || '';
            }
        });

        // Skip rows that are clearly empty or don't have a vessel name
        if (!row['navio / viagem'] || row['navio / viagem'].trim() === '') {
            console.warn(`[VesselScheduleService Debug] Skipping row ${i + 1} due to missing vessel name.`);
            continue;
        }

        try {
            const entry = mapRowToVesselScheduleEntry(row);
            vesselEntries.push(entry);
            if (i < 6) { // Log first 5 data rows for debugging
                console.log(`[VesselScheduleService Debug] Mapped Entry ${i}:`, entry);
            }
        } catch (e) {
            console.error(`[VesselScheduleService Debug] Error mapping row ${i + 1}:`, row, e);
        }
    }
    console.log(`[VesselScheduleService Debug] Successfully processed ${vesselEntries.length} vessel schedule entries.`);
    return vesselEntries;
}
