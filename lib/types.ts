export type MessageType = "deadline" | "number" | "tone";

export interface ChatApiResponse {
  type: MessageType;
  colorValue: number;
  hoursRemaining?: number;
  numberValue?: number;
  hindiResponse: string;
  englishTranslation: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  userText: string;
  hindiText?: string;
  englishText?: string;
  bgColor?: string;
  textColor?: string;
  type?: MessageType;
  colorValue?: number;
}
