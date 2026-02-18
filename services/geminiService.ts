import { GoogleGenAI, Type } from "@google/genai";
import type { UserInput, GenerationResult, GeminiTextResponse, DesignOption } from "../types";

/**
 * Vite uses import.meta.env instead of process.env
 * IMPORTANT: You must define VITE_GEMINI_API_KEY in Vercel
 */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result.split(",")[1]);
      }
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const textResponseSchema = {
  type: Type.OBJECT,
  properties: {
    fengshui_suggestions: { type: Type.STRING },
    design_options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description_lines: { type: Type.ARRAY, items: { type: Type.STRING } },
          key_elements: { type: Type.ARRAY, items: { type: Type.STRING } },
          image_prompt: { type: Type.STRING },
          negative_prompt: { type: Type.STRING },
        },
        required: [
          "name",
          "description_lines",
          "key_elements",
          "image_prompt",
          "negative_prompt",
        ],
      },
    },
  },
  required: ["fengshui_suggestions", "design_options"],
};

export async function generateDesigns(
  userInput: UserInput
): Promise<GenerationResult> {
  try {
    // STEP 1: Generate design text
    const textModel = "gemini-1.5-flash";

    const textPrompt = `
Bạn là một AI chuyên gia về kiến trúc và phong thủy.
Thông tin người dùng:
- Ngày sinh: ${userInput.dob}

1. Đưa ra gợi ý phong thủy ngắn gọn (2-3 câu).
2. Tạo 2 phương án thiết kế mặt tiền khác biệt rõ rệt.
3. Với mỗi phương án cung cấp:
- name
- description_lines (7-10 dòng)
- key_elements (3-5 yếu tố)
- image_prompt (English)
- negative_prompt (English)

Chỉ trả về JSON duy nhất.
`;

    const textResponse = await ai.models.generateContent({
      model: textModel,
      contents: textPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: textResponseSchema,
      },
    });

    const designData: GeminiTextResponse = JSON.parse(textResponse.text);

    if (!designData.design_options || designData.design_options.length < 2) {
      throw new Error("AI did not generate enough design options.");
    }

    // STEP 2: Generate images
    const imageModel = "gemini-2.5-flash-image";
    const imagePart = await fileToGenerativePart(userInput.imageFile);

    const [optionA, optionB] = await Promise.all(
      designData.design_options.slice(0, 2).map(async (option): Promise<DesignOption> => {
        const imagePrompt = `
Using the attached land plot photo for perspective and scale,
generate a photorealistic front facade design with style:
${option.image_prompt}

Requirements:
- Photorealistic architectural visualization
- Natural daylight
- No text, watermark, logo
- Perfect vertical lines
- Negative prompt: ${option.negative_prompt}
`;

        const imageGenResponse = await ai.models.generateContent({
          model: imageModel,
          contents: {
            parts: [{ text: imagePrompt }, imagePart],
          },
        });

        let imageBase64 = "";
        for (const part of imageGenResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            imageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }

        if (!imageBase64) {
          throw new Error(`Image generation failed for option: ${option.name}`);
        }

        return {
          name: option.name,
          description: option.description_lines,
          keyElements: option.key_elements,
          imageBase64,
        };
      })
    );

    return { optionA, optionB };
  } catch (error) {
    console.error("Error in Gemini service:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate designs: ${error.message}`);
    }
    throw new Error("Unknown error occurred.");
  }
}
