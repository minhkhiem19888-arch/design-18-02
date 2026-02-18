
export interface UserInput {
  dob: string;
  imageFile: File;
}

export interface DesignOption {
  name: string;
  description: string[];
  keyElements: string[];
  imageBase64: string;
}

export interface GenerationResult {
  optionA: DesignOption;
  optionB: DesignOption;
}

export interface GeminiTextResponse {
  fengshui_suggestions: string;
  design_options: {
      name: string;
      description_lines: string[];
      key_elements: string[];
      image_prompt: string;
      negative_prompt: string;
  }[];
}
