// src/utils/fileReaders.ts

import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js safely. This is crucial for it to work in a browser environment.
// We wrap it in a safe try-catch module-level block to prevent runtime crashes during initial asset loading.
try {
  if (pdfjsLib && 'GlobalWorkerOptions' in pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
  }
} catch (e) {
  console.warn("PDFJS GlobalWorkerOptions assignment caught at module load:", e);
}

/**
 * Reads a File object as plain text.
 * Suitable for .txt, .csv, and other plain text formats.
 * @param file The File object to read.
 * @returns A Promise that resolves to the file's content as a string.
 */
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

/**
 * Extracts text content from a PDF File object.
 * @param file The PDF File object to read.
 * @returns A Promise that resolves to the extracted text content.
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // The item type is TextItem, which has a `str` property.
    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return fullText;
};

/**
 * Extracts data from an Excel (.xlsx) File object and converts it to a CSV string.
 * Requires the 'xlsx' library.
 * @param file The Excel File object to read.
 * @returns A Promise that resolves to the Excel data as a CSV string.
 */
export const extractDataFromExcel = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        resolve(csv);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};