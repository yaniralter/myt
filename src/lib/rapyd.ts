import crypto from "crypto";

const RAPYD_BASE_URL = "https://sandboxapi.rapyd.net";

function getAccessKey() {
  return process.env.RAPYD_ACCESS_KEY!;
}

function getSecretKey() {
  return process.env.RAPYD_SECRET_KEY!;
}

function generateSignature(
  method: string,
  urlPath: string,
  body: string,
  salt: string,
  timestamp: number
): string {
  const toSign = method + urlPath + salt + timestamp + getAccessKey() + getSecretKey() + body;
  const hash = crypto
    .createHmac("sha256", getSecretKey())
    .update(toSign)
    .digest("hex");
  return Buffer.from(hash).toString("base64");
}

export async function rapydRequest(
  method: string,
  path: string,
  body: Record<string, unknown> | null = null
) {
  const salt = crypto.randomBytes(8).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000);
  const bodyStr = body ? JSON.stringify(body) : "";
  const signature = generateSignature(
    method.toLowerCase(),
    path,
    bodyStr,
    salt,
    timestamp
  );

  const res = await fetch(`${RAPYD_BASE_URL}${path}`, {
    method: method.toUpperCase(),
    headers: {
      "Content-Type": "application/json",
      access_key: getAccessKey(),
      salt,
      timestamp: timestamp.toString(),
      signature,
    },
    ...(body ? { body: bodyStr } : {}),
  });

  const data = await res.json();
  if (data.status?.status !== "SUCCESS") {
    throw new Error(
      data.status?.message || `Rapyd API error: ${res.status}`
    );
  }
  return data.body;
}

export async function createCheckout(params: {
  amount: number;
  currency: string;
  productName: string;
  completeUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}) {
  return rapydRequest("post", "/v1/checkout", {
    amount: params.amount,
    currency: params.currency,
    country: "US",
    complete_checkout_url: params.completeUrl,
    cancel_checkout_url: params.cancelUrl,
    language: "en",
    metadata: params.metadata,
    cart_items: [
      {
        name: params.productName,
        amount: params.amount,
        quantity: 1,
      },
    ],
  });
}

export const PLATFORM_COMMISSION_RATE =
  parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || "15") / 100;

export function calculateFees(priceInCents: number) {
  const platformFee = Math.round(priceInCents * PLATFORM_COMMISSION_RATE);
  const sellerAmount = priceInCents - platformFee;
  return { platformFee, sellerAmount };
}
