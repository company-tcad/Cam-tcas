
import { GoogleGenAI } from "@google/genai";
import { SceneAnalysis, ScanResult } from "../types";

// Initialize GoogleGenAI client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFrame = async (base64Image: string): Promise<SceneAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "Analyze this cinematic frame. Return JSON: luminance (0-100), colorTemp (string), detectedObjects (array), suggestions (string)." },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        }
      ],
      config: { responseMimeType: "application/json" }
    });
    // Access response.text property directly
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { luminance: 50, colorTemp: "Neutral", detectedObjects: [], suggestions: "Awaiting input" };
  }
};

export const analyzeTopology = async (base64Image: string): Promise<ScanResult> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "Act as a 3D Scanning expert. Analyze this image of an object being scanned. Detect topology errors, UV mapping issues, or missing geometry. Return JSON: vertices (est count), topologyScore (0-100), uvStatus (string), defects (array of strings), suggestedFix (string)." },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        }
      ],
      config: { responseMimeType: "application/json" }
    });
    // Access response.text property directly
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { vertices: 0, topologyScore: 0, uvStatus: "Error", defects: [], suggestedFix: "Reposition for better lighting" };
  }
};
