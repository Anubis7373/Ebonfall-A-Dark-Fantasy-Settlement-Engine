
import { GoogleGenAI, GenerateContentResponse, HarmBlockThreshold, HarmCategory } from "@google/genai";
import { SettlementState, TurnData, Survivor, GameHistory } from "../types";
import { SYSTEM_PROMPT } from "../constants";

let lastImageRequestTime = 0;
const MIN_IMAGE_INTERVAL = 3000;

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const errorMessage = err?.message || '';
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('RESOURCE_EXHAUSTED');
      
      if (isRateLimit && i < maxRetries - 1) {
        const delay = Math.pow(4, i) * 3000 + Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function getCleanStateForAI(state: SettlementState): any {
  const cleanSurvivors = state.survivors.map(s => {
    const { portraitUrl, ...rest } = s;
    return rest;
  });

  const cleanDeceased = state.deceased.map(s => {
    const { portraitUrl, ...rest } = s;
    return rest;
  });

  let cleanCommander = undefined;
  if (state.commander) {
    const { portraitUrl, ...rest } = state.commander;
    cleanCommander = rest;
  }

  return {
    ...state,
    commander: cleanCommander,
    survivors: cleanSurvivors,
    deceased: cleanDeceased,
    imageUrl: undefined 
  };
}

export async function describeCharacterFromImage(base64Image: string): Promise<string> {
   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
   const data = base64Image.split(',')[1];
   const mimeType = base64Image.substring(base64Image.indexOf(':') + 1, base64Image.indexOf(';'));

   try {
     const response = await ai.models.generateContent({
       model: "gemini-2.5-flash",
       contents: {
         parts: [
           { inlineData: { mimeType, data } },
           { text: "Describe the physical appearance of the person in this image. Focus strictly on visual traits: face, hair, facial hair, scars, eye color, and clothing style. Provide a concise, vivid description suitable for an image generator prompt. Do not describe the background." }
         ]
       }
     });
     return response.text || "";
   } catch (e) {
     console.error("Failed to describe character image:", e);
     return "";
   }
}

async function generateBase64Image(prompt: string, aspectRatio: "16:9" | "1:1" = "16:9"): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const now = Date.now();
  const timeSinceLast = now - lastImageRequestTime;
  if (timeSinceLast < MIN_IMAGE_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_IMAGE_INTERVAL - timeSinceLast));
  }
  lastImageRequestTime = Date.now();

  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ 
          text: `Cinematic wide shot movie frame. ${prompt}. Realistic photography, dark survival aesthetic, heavy atmospheric perspective, NO MAGIC, hyper-detailed, dramatic natural lighting, mud and rust, serious tone, film grain.` 
        }]
      },
      config: {
         imageConfig: { aspectRatio },
         safetySettings: [
           { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
           { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
           { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
           { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
         ]
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from API");
  });
}

export async function regenerateTurnImage(visualDescription: string): Promise<string> {
  return generateBase64Image(visualDescription, "16:9");
}

export async function generateSurvivorPortrait(survivor: Survivor): Promise<string> {
  const prompt = `A centered realistic bust portrait of ${survivor.name}, a ${survivor.role}. DESCRIPTION: ${survivor.visualDescription}. Solid dark rustic background, natural moody lighting, realistic skin textures, NO magic.`;
  return generateBase64Image(prompt, "1:1");
}

function extractJSON(input: string): any {
  if (!input) throw new Error("Received empty input for JSON extraction");
  const text = input.replace(/```json/g, '').replace(/```/g, '');
  const firstOpen = text.indexOf('{');
  if (firstOpen === -1) throw new Error("No JSON object start found");
  
  let balance = 0;
  let inString = false;
  let escape = false;
  let lastClose = -1;

  for (let i = firstOpen; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === '\\') escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') balance++;
    else if (char === '}') {
      balance--;
      if (balance === 0) {
        lastClose = i;
        break;
      }
    }
  }

  const jsonStr = lastClose !== -1 ? text.substring(firstOpen, lastClose + 1) : text.substring(firstOpen);

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    let fixed = jsonStr.replace(/,(\s*[}\]])/g, '$1');
    try {
      return JSON.parse(fixed);
    } catch (e2) {
      const quoted = fixed.replace(/([\[,]\s*)([^"\[\]{},\s\d\-tfn][^"\[\]{},\s]*)(?=\s*[,\]])/g, '$1"$2"');
      return JSON.parse(quoted);
    }
  }
}

function validateGrid(grid: any): string[][] | undefined {
  if (!Array.isArray(grid)) return undefined;
  const allowed = ['?', 'S', 'M', 'F', 'R', 'W', 'P', 'C'];
  return grid.map(row => 
    Array.isArray(row) ? row.map((cell: any) => {
      const c = String(cell).toUpperCase();
      return allowed.includes(c) ? c : '?';
    }) : []
  );
}

export async function generateTurn(state: SettlementState, history: GameHistory[], imagesEnabled: boolean, previousChoice?: string): Promise<TurnData> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanState = getCleanStateForAI(state);

  const recentHistory = history.slice(-10);
  const historyContext = recentHistory.length > 0 
    ? recentHistory.map((h) => `Turn ${h.turn}: ${h.choiceTaken || "None"}`).join('\n')
    : "Chronicle beginning.";

  const structuresList = state.structures && state.structures.length > 0 ? state.structures.join(', ') : "Simple tattered tents";
  
  const textPrompt = `
[CONSTRAINTS]: 1st Person ("I"). Use 1st person dialogue for survivors.
[HISTORY]: ${historyContext}
[VISUAL_ANCHOR]: Commander ${state.commander?.name} is ${state.commander?.visualDescription}.
[SETTLEMENT_STATE]: ${state.tier} with ${structuresList}.
[ACTION]: "${previousChoice || "Dawn breaks."}"

[DIRECTIVE]:
Narrate the physical consequence of the action. Focus on materiality (rust, mud, cold breath). 
End the response with the outcome log div.

[DATA]:
${JSON.stringify(cleanState)}
`;

  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const textResponse: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: textPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        }
      }));

      const textOutput = textResponse.text;
      if (!textOutput) throw new Error("Empty AI response.");
      
      const data: TurnData = extractJSON(textOutput);

      if (data.stateUpdate?.mapGrid) {
        data.stateUpdate.mapGrid = validateGrid(data.stateUpdate.mapGrid);
      }

      if (imagesEnabled && data.visualDescription) {
        try {
          // Force include the Commander's visual identity in the visual prompt
          const enhancedVisualPrompt = `${state.commander?.visualDescription}. ${data.visualDescription}. Environment: ${structuresList}. Low visibility, smog, survival realism.`;
          data.imageUrl = await generateBase64Image(enhancedVisualPrompt, "16:9");
        } catch (imgError: any) {
          console.warn("Image generation failed:", imgError);
        }
      }

      return data;
    } catch (error: any) {
      console.error(`Gemini Attempt ${attempt + 1} Failed:`, error);
      lastError = error;
    }
  }

  return {
    narrative: "The record fails. The smog is too thick.",
    visualDescription: "Dense black fog.",
    mapAscii: "",
    stateUpdate: {},
    choices: [{ id: "retry", text: "Wait", description: "Bide your time.", hint: "Try again." }]
  };
}
