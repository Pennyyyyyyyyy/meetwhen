import { parseScheduleImage } from "@/server/visionParser";
import { parseAvailabilityText } from "@/lib/nlpParser";
import { ApiError } from "@/server/responses";
import { Errs } from "@/server/errs";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function parseScheduleFromFile(file: File | null) {
  if (!file) {
    throw new ApiError(Errs.IMAGE_REQUIRED);
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new ApiError(Errs.UNSUPPORTED_IMAGE_TYPE);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  const result = await parseScheduleImage(base64, file.type);

  if (!result.ok) {
    const errDef =
      result.reason === "MISSING_API_KEY"
        ? Errs.MISSING_API_KEY
        : result.reason === "GEMINI_API_ERROR"
          ? Errs.GEMINI_API_ERROR
          : result.reason === "EMPTY_RESPONSE"
            ? Errs.GEMINI_EMPTY_RESPONSE
            : Errs.GEMINI_JSON_PARSE_FAILED;
    throw new ApiError(errDef, { reason: result.reason, detail: result.detail });
  }
  return { busy: result.busy };
}

export function parseText(text: unknown) {
  if (typeof text !== "string" || !text) {
    throw new ApiError(Errs.INVALID_INPUT, { hint: "text 為必填字串" });
  }
  const result = parseAvailabilityText(text);
  if (!result) {
    return {
      parsed: false as const,
      message: "無法解析,請使用類似「18:00-20:00 有空」的格式",
    };
  }
  return { parsed: true as const, ...result };
}
