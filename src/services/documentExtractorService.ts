// src/services/documentExtractorService.ts

import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { ExtractedImportData } from '../types';

const PRODUCT_LIST_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      itemNumber: { type: Type.STRING },
      sapNo: { type: Type.STRING },
      description: { type: Type.STRING },
      ncmCode: { type: Type.STRING },
      quantity: { type: Type.NUMBER },
      unitValueCNY: { type: Type.NUMBER },
      totalValueCNY: { type: Type.NUMBER },
      netWeightKgs: { type: Type.NUMBER },
      grossWeightKgs: { type: Type.NUMBER },
      cbm: { type: Type.NUMBER },
      vin: { type: Type.STRING },
      model: { type: Type.STRING },
      color: { type: Type.STRING },
      batterySerialNo: { type: Type.STRING }
    },
    required: ["description", "quantity"]
  }
};

const CONTAINER_LIST_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      containerNumber: { type: Type.STRING, description: "Unique container identification number" },
      sealNumber: { type: Type.STRING, description: "Seal number of the container" },
      type: { type: Type.STRING, description: "Type of container (e.g., 40HC, 20GP, 20ST, 40ST)" },
      cbm: { type: Type.NUMBER, description: "Cubic meters of cargo in this container" },
      grossWeightKgs: { type: Type.NUMBER, description: "Gross weight in Kgs for this container" }
    },
    required: ["containerNumber"]
  }
};

// Lazy initializer for the Gemini client to prevent browser initialization crashes if API keys are missing on load.
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

async function callGeminiApi(prompt: string, schema: any, documentInput: string, mimeType: string): Promise<any> {
    
    const contentParts: any[] = [];
    if (mimeType.startsWith('image/')) {
        contentParts.push({ text: prompt });
        contentParts.push({ inlineData: { mimeType: mimeType, data: documentInput } });
    } else {
        contentParts.push({ text: `${prompt}\n\nDocument Content:\n\"\"\"\n${documentInput}\n\"\"\"` });
    }

    try {
        const ai = getAiClient();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: contentParts },
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const jsonString = response.text;
        if (jsonString) {
            try {
                return JSON.parse(jsonString.trim());
            } catch (jsonError) {
                console.error("[Gemini API] Failed to parse JSON response:", jsonError, "Raw response:", jsonString);
                throw new Error("AI response was malformed JSON.");
            }
        } else {
            console.warn("[Gemini API] No content found in response:", response);
            throw new Error("AI did not return any extractable content.");
        }
    } catch (apiError) {
        console.error("Error calling Gemini API:", apiError);
        throw apiError;
    }
}

export async function extractInvoiceOrPackingListData(documentInput: string, mimeType: string): Promise<ExtractedImportData | null> {
    const prompt = `You are an expert in Brazilian Foreign Trade. Extract information from the provided import document (Commercial Invoice or Packing List).

    Focus on:
    - Importer/Exporter/Supplier details.
    - Document numbers: Purchase Order (PO), Invoice Number, Invoice Date.
    - Totals: Gross Weight, Net Weight, CBM, Quantity.
    - Financials: Total FOB Value (in CNY), Total Ocean Freight (in USD).
    - Logistics parties: Incoterm, Responsible Broker, Freight Forwarder, Shipowner.
    - Product details: For each item, extract all available details like description, NCM, quantity, values, weights, and vehicle specifics (VIN, Model, etc.).

    Strictly adhere to the provided JSON schema. Omit fields not found. Format dates as YYYY-MM-DD.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            exporterName: { type: Type.STRING },
            poNumber: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            invoiceDate: { type: Type.STRING },
            totalGrossWeightKgs: { type: Type.NUMBER },
            totalNetWeightKgs: { type: Type.NUMBER },
            totalMeasurementCBM: { type: Type.NUMBER },
            totalFOBValueCNY: { type: Type.NUMBER },
            totalOceanFreightUSD: { type: Type.NUMBER },
            incoterm: { type: Type.STRING },
            responsibleBroker: { type: Type.STRING },
            freightForwarder: { type: Type.STRING },
            shipowner: { type: Type.STRING },
            products: PRODUCT_LIST_SCHEMA
        }
    };

    try {
        const result = await callGeminiApi(prompt, schema, documentInput, mimeType);
        return result as ExtractedImportData;
    } catch (e) {
        console.error("[Extractor] Invoice/Packing List extraction failed:", e);
        throw e;
    }
}

export async function extractBLDataFromDocument(documentInput: string, mimeType: string): Promise<ExtractedImportData | null> {
    const prompt = `You are an expert in Brazilian Foreign Trade. Extract information from the provided Bill of Lading (BL).

    Focus on:
    - BL Number.
    - Vessel and Voyage details.
    - Ports: Port of Loading, Port of Discharge.
    - Estimated Arrival Date (ETA).
    - Total cargo dimensions: Total Gross Weight, Total CBM.
    - Container details: For each container, extract Number, Seal, Type, CBM, and Gross Weight.

    Strictly adhere to the provided JSON schema. Omit fields not found. Format dates as YYYY-MM-DD.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            blNumber: { type: Type.STRING },
            vesselName: { type: Type.STRING },
            voyageNumber: { type: Type.STRING },
            portOfLoading: { type: Type.STRING },
            portOfDischarge: { type: Type.STRING },
            estimatedArrivalDate: { type: Type.STRING },
            totalGrossWeightKgs: { type: Type.NUMBER },
            totalMeasurementCBM: { type: Type.NUMBER },
            containers: CONTAINER_LIST_SCHEMA
        }
    };

    try {
        const result = await callGeminiApi(prompt, schema, documentInput, mimeType);
        return result as ExtractedImportData;
    } catch (e) {
        console.error("[Extractor] BL extraction failed:", e);
        throw e;
    }
}
