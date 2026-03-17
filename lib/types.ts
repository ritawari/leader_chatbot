export type MessageType = "deadline" | "number" | "tone";

export interface ChatApiResponse {
  type: MessageType;
  colorValue: number;
  bgColor: string;
  textColor: string;
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
