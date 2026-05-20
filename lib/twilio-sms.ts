import twilio from "twilio";

type TwilioClient = ReturnType<typeof twilio>;

let cached: TwilioClient | null = null;

export function getTwilioClient(): TwilioClient | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid) return null;

  if (!cached) {
    if (apiKeySid && apiKeySecret) {
      cached = twilio(apiKeySid, apiKeySecret, { accountSid });
    } else if (authToken) {
      cached = twilio(accountSid, authToken);
    } else {
      return null;
    }
  }
  return cached;
}

export function getTwilioFromNumber(): string | null {
  const raw = process.env.TWILIO_PHONE_NUMBER;
  if (!raw) return null;
  return raw.replace(/\s+/g, "");
}
