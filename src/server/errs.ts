export interface ErrDef {
  code: string;
  message: string;
  status: number;
}

export const Errs = {
  INVALID_INPUT: {
    code: "INVALID_INPUT",
    message: "輸入格式錯誤",
    status: 400,
  },
  EVENT_NOT_FOUND: {
    code: "EVENT_NOT_FOUND",
    message: "活動不存在",
    status: 404,
  },
  PARTICIPANT_NOT_IN_EVENT: {
    code: "PARTICIPANT_NOT_IN_EVENT",
    message: "參與者不存在或不屬於此活動",
    status: 404,
  },
  UNSUPPORTED_IMAGE_TYPE: {
    code: "UNSUPPORTED_IMAGE_TYPE",
    message: "僅支援 JPG、PNG、WebP 格式",
    status: 400,
  },
  IMAGE_REQUIRED: {
    code: "IMAGE_REQUIRED",
    message: "請上傳圖片",
    status: 400,
  },
  SCHEDULE_PARSE_FAILED: {
    code: "SCHEDULE_PARSE_FAILED",
    message: "解析失敗,請確認圖片為課表並重試",
    status: 422,
  },
  GEMINI_API_ERROR: {
    code: "GEMINI_API_ERROR",
    message: "AI 服務回傳錯誤(可能是配額用完、API key 失效或圖片過大)",
    status: 502,
  },
  GEMINI_EMPTY_RESPONSE: {
    code: "GEMINI_EMPTY_RESPONSE",
    message: "AI 沒有回傳內容(可能被安全過濾擋下,換張圖試試)",
    status: 502,
  },
  GEMINI_JSON_PARSE_FAILED: {
    code: "GEMINI_JSON_PARSE_FAILED",
    message: "AI 回傳格式錯誤,無法解析為 JSON",
    status: 502,
  },
  MISSING_API_KEY: {
    code: "MISSING_API_KEY",
    message: "伺服器未設定 GEMINI_API_KEY",
    status: 500,
  },
} as const satisfies Record<string, ErrDef>;

export type ErrKey = keyof typeof Errs;
