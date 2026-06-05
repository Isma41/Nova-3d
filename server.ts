import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Helper for retrying AI calls
  const generateWithRetry = async (params: any, maxRetries = 3) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await ai.models.generateContent(params);
      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || "";
        const is503 = errorMessage.includes("503") || 
                     errorMessage.includes("high demand") ||
                     errorMessage.includes("UNAVAILABLE") ||
                     error.status === 503;
        
        const is429 = errorMessage.includes("429") ||
                     errorMessage.includes("RESOURCE_EXHAUSTED") ||
                     error.status === 429;

        if (is503 && i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000; // Exponential backoff
          console.log(`AI high demand (503). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (is429) {
          // If we hit a rate limit, the error message often contains "Please retry in X seconds"
          const match = errorMessage.match(/retry in ([\d.]+)s/);
          if (match && i < maxRetries - 1) {
            const waitSeconds = parseFloat(match[1]) + 1; // Add 1s buffer
            console.log(`AI Rate Limit (429). Waiting ${waitSeconds}s as requested...`);
            await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
            continue;
          }
          
          if (errorMessage.includes("Quota exceeded")) {
             throw new Error("Límite diario de IA alcanzado. Por favor, intenta de nuevo mañana o en unos minutos.");
          }
        }

        throw error;
      }
    }
    throw lastError;
  };

  // API Route: Convert Image to 3D Scene JSON
  app.post("/api/convert-to-3d", async (req, res) => {
    try {
      const { image, mimeType } = req.body;

      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Ensure we only have the base64 part if it came with a prefix
      const base64Data = image.includes(',') ? image.split(',')[1] : image;

      const prompt = `Analyze this image and decompose it into a set of basic 3D primitives (cubes, spheres, cylinders, cones, planes, and text). 
      
      CRITICAL: If you detect people, perform a surgical and high-fidelity anatomical reconstruction using primitives:
      - Coordinate System: Y is UP. [0,0,0] is the ground center.
      - FACIAL DETAILS: Use tiny SPHERES (scale approx 0.02-0.05) for EYES, NOSE tip, and EARS. Use thin BOXES or curved PLANES for LIPS.
      - JOINTS: Use SPHERES at every major joint (shoulders, elbows, wrists, hips, knees, ankles) to bridge limbs smoothly.
      - LIMBS & TORSO: Use CYLINDERS for arms and legs. Use a large BOX or multiple BOXES for the torso. 
      - BODY CONTOURS: Use flattened SPHERES (vary the scale on one axis) to represent muscles, breasts, and curves of the body.
      - EXTREMITIES: Use BOXES or CONES for SHOES and feet. Use tiny cylinders for fingers if visible.
      - The goal is a "digital mannequin" that perfectly mimics the pose and anatomical details from the photo.
      
      If you detect any legible text or letters, represent them as a "text" type object.
      
      Provide a JSON array of objects representing these primitives to recreate the visual essence of the image in a 3D scene.
      Each object must have:
      - type: "box" | "sphere" | "cylinder" | "cone" | "plane" | "text"
      - position: [x, y, z] (absolute world space, Y is UP)
      - rotation: [x, y, z] (in radians)
      - scale: [x, y, z] (NEVER use 0. Minimum component scale is 0.01)
      - color: hex string reflecting the actual colors in the image (e.g., skin tones, clothing colors)
      - name: extremely descriptive name (e.g., "Right Iris", "Left Ear Lobe", "Torso Upper")
      - text: string (ONLY for type: "text")
      
      Be extremely granular. A single person should use 50-100+ small primitives for maximum detail.`;

      const response = await generateWithRetry({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType || "image/png", data: base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              objects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING },
                    position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    rotation: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    scale: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    color: { type: Type.STRING },
                    name: { type: Type.STRING },
                    text: { type: Type.STRING }
                  },
                  required: ["type", "position", "rotation", "scale", "color"]
                }
              }
            },
            required: ["objects"]
          }
        }
      });

      let text = response.text || "";
      // Strip markdown code blocks if they exist
      if (text.startsWith("```")) {
        text = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      }

      try {
        const result = JSON.parse(text || '{"objects": []}');
        res.json(result);
      } catch (parseError) {
        console.error("Failed to parse AI response:", text);
        throw new Error("La IA devolvió un formato inválido. Intenta de nuevo.");
      }
    } catch (error: any) {
      console.error("Conversion error details:", error);
      const isQuota = error.message?.includes("Límite diario") || error.message?.includes("Quota exceeded");
      const msg = isQuota ? error.message : "La IA está saturada actualmente. Por favor, espera un momento y vuelve a intentarlo.";
      res.status(500).json({ error: msg });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
