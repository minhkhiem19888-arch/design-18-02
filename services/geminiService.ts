import { GoogleGenAI, Type } from "@google/genai";
import type { UserInput, GenerationResult, GeminiTextResponse, DesignOption } from "../types";

/**
 * Vite frontend MUST use import.meta.env (not process.env)
 * IMPORTANT: Set VITE_GEMINI_API_KEY in Vercel Environment Variables
 */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        if (typeof reader.result === "string") {
          const base64 = reader.result.split(",")[1];
          if (!base64) return reject(new Error("Failed to read file as base64"));
          resolve(base64);
        } else {
          reject(new Error("Failed to read file"));
        }
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
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
        required: ["name", "description_lines", "key_elements", "image_prompt", "negative_prompt"],
      },
    },
  },
  required: ["fengshui_suggestions", "design_options"],
};

export async function generateDesigns(userInput: UserInput): Promise<GenerationResult> {
  try {
    // Step 1: Generate design prompts and text descriptions
    // Use a model that is supported for generateContent with this SDK
    const textModel = "gemini-2.0-flash";

    const textPrompt = `
Bạn là một AI chuyên gia về kiến trúc và phong thủy. Một người dùng cung cấp thông tin và ảnh lô đất để nhận 2 phương án thiết kế mặt tiền.
Thông tin người dùng:
- Ngày sinh: ${userInput.dob}

Nhiệm vụ của bạn:
1. Dựa vào ngày sinh, đưa ra một gợi ý phong thủy ngắn gọn (2-3 câu), tích cực. Lưu ý đây chỉ là gợi ý, không phải khẳng định tuyệt đối.
2. Tạo ra hai (2) phương án thiết kế mặt tiền kiến trúc khác biệt rõ rệt cho một ngôi nhà mới.
3. Đối với mỗi phương án, cung cấp:
   - "name": Tên phong cách (ví dụ: "Biệt Thự Hiện Đại Nhiệt Đới", "Nét Duyên Indochine Cổ Điển").
   - "description_lines": Một mô tả chi tiết bằng tiếng Việt (7-10 dòng), chia thành các câu trong một mảng.
   - "key_elements": Danh sách 3-5 yếu tố kiến trúc chính, bằng tiếng Việt.
   - "image_prompt": Một câu lệnh (prompt) chi tiết bằng tiếng Anh để tạo ảnh bằng AI. Prompt này phải mô tả phong cách kiến trúc, vật liệu, màu sắc, và không khí chung.
   - "negative_prompt": Một câu lệnh phủ định bằng tiếng Anh (ví dụ: "cartoon, blurry, watermark, text, signature").

Hai phương án phải khác biệt về phong cách (ví dụ: một hiện đại, một cổ điển; một tối giản, một nhiệt đới).
Câu lệnh tạo ảnh phải dựa trên ảnh lô đất được cung cấp để tham khảo phối cảnh, tỷ lệ và môi trường xung quanh.

Chỉ trả về một đối tượng JSON duy nhất, không có văn bản nào khác bên ngoài đối tượng JSON này.
`;

    const textResponse = await ai.models.generateContent({
      model: textModel,
      // IMPORTANT: contents format must be [{ role, parts: [{text}]}]
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: textResponseSchema,
      },
    });

    const designData: GeminiTextResponse = JSON.parse(textResponse.text);

    if (!designData.design_options || designData.design_options.length < 2) {
      throw new Error("AI did not generate enough design options.");
    }

    // Step 2: Generate images for the two options
    const imageModel = "gemini-2.5-flash-image";
    const imagePart = await fileToGenerativePart(userInput.imageFile);

    const [optionA, optionB] = await Promise.all(
      designData.design_options.slice(0, 2).map(async (option): Promise<DesignOption> => {
        const imagePrompt = `
Using the attached land plot photo for perspective, scale, and environmental context, generate a photorealistic architectural visualization of a house facade with this style: ${option.image_prompt}.
Key requirements:
- Realistic front elevation facade design.
- Photorealistic architectural visualization style.
- Render with natural daytime lighting.
- No text, no logos, no watermarks, no signatures, no signage.
- All vertical lines must be perfectly straight, no distortion.
- Negative prompt: ${option.negative_prompt}
`;

        const imageGenResponse = await ai.models.generateContent({
          model: imageModel,
          // IMPORTANT: contents format must be [{ role, parts: [...] }]
          contents: [{ role: "user", parts: [{ text: imagePrompt }, imagePart] }],
        });

        let imageBase64 = "";
        const candidate = imageGenResponse?.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data && part.inlineData?.mimeType) {
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
          imageBase64: imageBase64,
        };
      })
    );

    return { optionA, optionB };
  } catch (error) {
    console.error("Error in Gemini service:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate designs: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating designs.");
  }
}
