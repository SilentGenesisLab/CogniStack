import OpenAI from "openai";

const globalForAI = globalThis as unknown as {
  ark: OpenAI | undefined;
};

export const ark =
  globalForAI.ark ??
  new OpenAI({
    apiKey: process.env.ARK_API_KEY,
    baseURL:
      process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3",
  });

if (process.env.NODE_ENV !== "production") globalForAI.ark = ark;

export const ARK_MODEL =
  process.env.ARK_MODEL || "ep-20260312015430-tjwjf";

export default ark;
