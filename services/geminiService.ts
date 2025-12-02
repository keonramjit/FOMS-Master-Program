import { GoogleGenAI, Type } from "@google/genai";
import { Flight, CrewMember, Aircraft } from "../types";

// Function to convert file to base64 with mimeType
export const fileToGenerativePart = async (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        mimeType: file.type,
        data: base64Data
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const parseScheduleImage = async (
  filePart: { mimeType: string; data: string },
  date: string,
  currentCrew: CrewMember[],
  currentFleet: Aircraft[]
): Promise<Flight[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Prepare context strings from dynamic state for the AI to reference
  const crewList = currentCrew.map(c => `${c.code} (${c.name})`).join(', ');
  
  // Create a robust fleet map for the prompt (e.g. "G maps to 8R-GAC (C208B)")
  const fleetContext = currentFleet.map(f => {
    // heuristics: get the last letter of the reg for the short code
    const shortCode = f.registration.split('-')[1]?.slice(-1) || ''; 
    return `Full Reg: ${f.registration} (Type: ${f.type}, Short Code: ${shortCode})`;
  }).join('\n');

  const prompt = `
    Role: You are the TGA Flight Data Extraction Specialist. Your job is to analyze "Daily Flight Program" PDF schedules for Trans Guyana Airways and extract structured flight data into a clean JSON format for the "TGA Flight Manager" application.

    --------------------------------------------------------
    1. KNOWLEDGE BASE (Reference for OCR Correction)
    --------------------------------------------------------
    Use this valid data to correct any scanning errors (e.g. "1HR" -> "JHR").

    VALID AIRCRAFT FLEET:
    ${fleetContext}

    VALID CREW ROSTER:
    ${crewList}

    --------------------------------------------------------
    2. DOCUMENT CONTEXT & STRUCTURE
    --------------------------------------------------------
    You will be processing daily flight schedules. The document is structured as follows:
    - **Header:** Contains the date of the program.
    - **Grid Layout:** The document is a table divided into horizontal sections.
    - **Aircraft Sections:** The fleet consists of ~14 aircraft. Each aircraft has its own dedicated section (block) of approximately 6 rows.
    - **Separators:** Aircraft sections are visually separated by a blank or grey-colored row.
    - **Color Coding & Status:**
        - **Yellow Section:** Indicates Maintenance (AOG, Check, etc.).
        - **Blue Section:** Indicates Shuttle Operations.
        - **White/None:** Indicates Active/Line Flying.

    --------------------------------------------------------
    3. EXTRACTION RULES
    --------------------------------------------------------
    1. **Global Metadata - Date:** Extract the date from the top of the page. Format as YYYY-MM-DD. If strictly not found, default to "${date}".

    2. **Aircraft Block Identification:** 
       - Locate the Aircraft Type (e.g., C208B, B1900D) and the registration code at the start of a section.
       - **Registration Formatting:** ALWAYS prefix the 3-letter registration with "8R-". (e.g., if the PDF says "GHW", extract "8R-GHW").
       - If only a single letter is visible (e.g. 'G'), use the Valid Aircraft Fleet list to infer the full 8R- registration.

    3. **Row-by-Row Flight Extraction:**
       For each aircraft section, extract the rows containing flight data. Map the columns as follows (Left to Right):
       - **Customer Name:** The name of the client (e.g., "Intolink Logistics", "Correia Mining").
       - **Route:** Airport codes or names (e.g., KKN, OGL).
       - **Aircraft Type:** (e.g., C208B).
       - **Registration:** (e.g., 8R-GHR).
       - **Crew - PIC:** Pilot in Command Initials (e.g., FAA).
       - **Crew - SIC:** Second in Command Initials (if present).
       - **ETD:** Estimated Time of Departure (e.g., 07:15). Convert 7.15 to 07:15.
       - **Comments:** Operational notes (e.g., "DROP OFF PAX", "AOG FOR CHECK").
       - **Crew Time:** The round-trip flight duration (e.g., 2:37).
       - **Flight Number:** Starts with "TGY" followed by numbers (e.g., TGY7411). If missing/TBA, leave empty.

    4. **Special Logic for "Status" (flightType):**
       - **Maintenance:** If the section is highlighted Yellow OR the comments contain "AOG", "CHECK", "MAINTENANCE", or "NOZZLE", set flightType to "Maintenance".
       - **Shuttle:** If the section is highlighted Blue OR the comments/customer say "SHUTTLE", set flightType to "Shuttle".
       - **Active:** If neither of the above, set flightType to "Active".

    5. **Handling Empty Fields:**
       - If a field (like SIC or Comments) is empty in the PDF, return null or an empty string "". Do not hallucinate data.

    --------------------------------------------------------
    4. OUTPUT FORMAT
    --------------------------------------------------------
    Return a JSON Array of Flight Objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: [
        {
          inlineData: {
            mimeType: filePart.mimeType,
            data: filePart.data
          }
        },
        { text: prompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              flightNumber: { type: Type.STRING },
              route: { type: Type.STRING },
              aircraftType: { type: Type.STRING },
              aircraftRegistration: { type: Type.STRING },
              pic: { type: Type.STRING },
              sic: { type: Type.STRING },
              etd: { type: Type.STRING },
              customer: { type: Type.STRING },
              notes: { type: Type.STRING },
              flightTime: { type: Type.STRING, description: "Duration in format H:MM or decimal" },
              flightType: { type: Type.STRING, enum: ["Active", "Maintenance", "Shuttle"] }
            }
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    
    // Enrich with local IDs and Date
    return data.map((item: any, index: number) => {
      // Parse flight time from string (e.g. "1:30" -> 1.5)
      let duration = 0;
      if (item.flightTime) {
        if (item.flightTime.includes(':')) {
          const [h, m] = item.flightTime.split(':').map(Number);
          duration = h + (m / 60);
        } else {
          duration = parseFloat(item.flightTime) || 0;
        }
      }

      // Handle flightType logic for display notes
      let finalNotes = item.notes || '';
      let finalCustomer = item.customer || '';

      if (item.flightType === 'Maintenance') {
        finalNotes = finalNotes ? `[MAINTENANCE] ${finalNotes}` : `[MAINTENANCE]`;
      } else if (item.flightType === 'Shuttle') {
        if (!finalCustomer.toUpperCase().includes('SHUTTLE')) {
           finalNotes = finalNotes ? `[SHUTTLE] ${finalNotes}` : `[SHUTTLE]`;
        }
      }

      return {
        ...item,
        id: `imported-${Date.now()}-${index}`,
        status: 'Scheduled',
        date: date,
        // Fallbacks and cleanup
        flightNumber: item.flightNumber || 'TBA',
        route: item.route ? item.route.toUpperCase() : 'OGL',
        aircraftType: item.aircraftType || 'C208B',
        aircraftRegistration: item.aircraftRegistration?.toUpperCase() || '',
        pic: item.pic?.toUpperCase() || '',
        sic: item.sic?.toUpperCase() || '',
        flightTime: parseFloat(duration.toFixed(2)),
        notes: finalNotes,
        customer: finalCustomer
      };
    });

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw error;
  }
};