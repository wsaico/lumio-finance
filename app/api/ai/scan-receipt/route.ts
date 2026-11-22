export const dynamic = "force-dynamic";

if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const RECEIPT_PROMPT = `
Analiza esta imagen de un comprobante, captura de billetera digital (Yape, Plin, Tunki, Izipay, Niubiz, Agora, Lukita, etc.), boleta o factura de Perú / Latinoamérica.
Extrae estrictamente este JSON válido sin texto adicional:

{
  "amount": number | null,
  "currency": "PEN" | "USD" | "EUR",
  "date": "YYYY-MM-DD" | null,
  "time": "HH:mm" | null,
  "vendor": string | null,
  "transactionType": "EXPENSE" | "INCOME",
  "walletApp": "YAPE" | "PLIN" | "BOLETA" | "FACTURA" | "OTRO",
  "operationNumber": string | null,
  "receiptNumber": string | null,
  "receiptType": "YAPE" | "PLIN" | "FACTURA" | "BOLETA" | "RECIBO" | "TICKET" | "OTRO",
  "description": string | null,
  "taxAmount": number
}

Reglas clave para Perú / LATAM:
- Dirección de la operación:
  * Si dice "¡Yapeaste!", "Enviaste", "Transferiste", "Pago exitoso", "Pagaste", o es una boleta/factura/ticket de compra -> "transactionType": "EXPENSE".
  * Si dice "¡Te yapearon!", "Recibiste", "Te enviaron", "Te plinearon", "Abono recibido" -> "transactionType": "INCOME".
- Billetera / Comprobante:
  * Yape (pantalla morada/turquesa o logo Yape) -> "walletApp": "YAPE", "receiptType": "YAPE".
  * Plin / Interbank / BBVA / Scotiabank Plin -> "walletApp": "PLIN", "receiptType": "PLIN".
  * Factura con RUC -> "walletApp": "FACTURA", "receiptType": "FACTURA".
  * Boleta / Ticket POS -> "walletApp": "BOLETA", "receiptType": "BOLETA" (o "TICKET").
- "operationNumber": número o código de operación (ej. "04829134", "Nro. de operación", "Código de seguridad / op"). Copia el mismo valor o serie en "receiptNumber" si aplica.
- "vendor": nombre de la persona (destinatario o remitente en Yape/Plin) o razón social del comercio.
- "description": descripción concisa y natural (ej. "Yape a Bodega Don Pepe", "Plin recibido de Juan Pérez", "Consumo en restaurante").
- "amount": número decimal positivo (sin símbolo S/ o $).
- "currency": "PEN" si muestra "S/", "S/." o "SOLES"; "USD" si muestra "$" o "USD". Por defecto "PEN".
- "date" en formato "YYYY-MM-DD" y "time" en formato 24h "HH:mm" si aparecen en pantalla (convierte am/pm). Si falta la fecha, usa null.
- "taxAmount": IGV/impuesto si aparece visible, sino 0.
`;

function parseDataUrl(image: string): { mimeType: string; base64Data: string; dataUrl: string } {
    const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
        return { mimeType: matches[1], base64Data: matches[2], dataUrl: image };
    }
    const cleanB64 = image.replace(/^data:image\/\w+;base64,/, "");
    return { mimeType: "image/jpeg", base64Data: cleanB64, dataUrl: `data:image/jpeg;base64,${cleanB64}` };
}

function cleanAndParseJson(text: string) {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
}

async function callMistralVision(dataUrl: string, apiKey: string) {
    const models = ["mistral-small-latest", "pixtral-12b-2409"];
    let lastError: Error | null = null;

    for (const model of models) {
        try {
            const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    temperature: 0.1,
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: RECEIPT_PROMPT },
                                { type: "image_url", image_url: { url: dataUrl } },
                            ],
                        },
                    ],
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                lastError = new Error(`Mistral (${model}) HTTP ${res.status}: ${errText.slice(0, 200)}`);
                continue;
            }

            const payload = await res.json();
            const content = payload?.choices?.[0]?.message?.content;
            if (!content) {
                lastError = new Error(`Mistral (${model}) devolvió respuesta vacía`);
                continue;
            }
            const parsed = cleanAndParseJson(content);
            return { data: parsed, provider: `mistral:${model}` };
        } catch (err: any) {
            lastError = err instanceof Error ? err : new Error(String(err));
        }
    }

    throw lastError || new Error("Mistral Vision no pudo procesar el comprobante");
}

async function callGeminiVision(base64Data: string, mimeType: string, apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const models = [
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest",
    ];
    let lastError: Error | null = null;

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                RECEIPT_PROMPT,
                {
                    inlineData: {
                        data: base64Data,
                        mimeType,
                    },
                },
            ]);
            const text = (await result.response).text();
            const parsed = cleanAndParseJson(text);
            return { data: parsed, provider: `gemini:${modelName}` };
        } catch (err: any) {
            lastError = err instanceof Error ? err : new Error(String(err));
        }
    }

    throw lastError || new Error("Gemini Vision no pudo procesar el comprobante");
}

function normalizeScannedPayload(raw: any) {
    const amountNum = Number(raw?.amount);
    const amount = Number.isFinite(amountNum) && amountNum > 0 ? Math.round(amountNum * 100) / 100 : null;
    const currency = ["PEN", "USD", "EUR"].includes(String(raw?.currency || "").toUpperCase())
        ? String(raw.currency).toUpperCase()
        : "PEN";
    const transactionType = raw?.transactionType === "INCOME" ? "INCOME" : "EXPENSE";
    const walletRaw = String(raw?.walletApp || raw?.receiptType || "OTRO").toUpperCase();
    const walletApp = ["YAPE", "PLIN", "BOLETA", "FACTURA", "OTRO"].includes(walletRaw)
        ? walletRaw
        : "OTRO";
    const operationNumber = raw?.operationNumber
        ? String(raw.operationNumber).trim()
        : raw?.receiptNumber
          ? String(raw.receiptNumber).trim()
          : null;
    const dateStr =
        typeof raw?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date.trim())
            ? raw.date.trim()
            : null;
    const timeStr =
        typeof raw?.time === "string" && /^\d{1,2}:\d{2}$/.test(raw.time.trim())
            ? raw.time.trim().padStart(5, "0")
            : null;
    const vendor = raw?.vendor ? String(raw.vendor).trim() : null;
    const description = raw?.description
        ? String(raw.description).trim()
        : vendor
          ? `${walletApp === "YAPE" || walletApp === "PLIN" ? walletApp : "Pago"} · ${vendor}`
          : null;
    const receiptType = String(raw?.receiptType || walletApp || "OTRO").toUpperCase();
    const taxAmount = Number.isFinite(Number(raw?.taxAmount)) ? Number(raw.taxAmount) : 0;

    return {
        amount,
        currency,
        date: dateStr,
        time: timeStr,
        vendor,
        transactionType,
        walletApp,
        operationNumber,
        receiptNumber: raw?.receiptNumber ? String(raw.receiptNumber).trim() : operationNumber,
        receiptType,
        description,
        taxAmount,
    };
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { image } = await req.json();
        if (!image) {
            return NextResponse.json(
                { error: "Se requiere una imagen en base64" },
                { status: 400 }
            );
        }

        const geminiKey = process.env.GEMINI_API_KEY?.trim();
        const mistralKey = process.env.MISTRAL_API_KEY?.trim();
        const preferred = (process.env.RECEIPT_AI_PROVIDER || "").trim().toLowerCase();

        if (!geminiKey && !mistralKey) {
            console.error("Neither GEMINI_API_KEY nor MISTRAL_API_KEY is configured");
            return NextResponse.json(
                { error: "Configuración incompleta: falta GEMINI_API_KEY o MISTRAL_API_KEY" },
                { status: 500 }
            );
        }

        const { mimeType, base64Data, dataUrl } = parseDataUrl(image);
        const preferMistral = Boolean(mistralKey && (preferred === "mistral" || !geminiKey));

        let aiOutcome: { data: any; provider: string } | null = null;
        let primaryErr: any = null;

        if (preferMistral && mistralKey) {
            try {
                aiOutcome = await callMistralVision(dataUrl, mistralKey);
            } catch (err) {
                primaryErr = err;
                if (geminiKey) {
                    aiOutcome = await callGeminiVision(base64Data, mimeType, geminiKey);
                }
            }
        } else if (geminiKey) {
            try {
                aiOutcome = await callGeminiVision(base64Data, mimeType, geminiKey);
            } catch (err) {
                primaryErr = err;
                if (mistralKey) {
                    aiOutcome = await callMistralVision(dataUrl, mistralKey);
                }
            }
        }

        if (!aiOutcome) {
            throw primaryErr || new Error("No se pudo procesar el comprobante");
        }

        const normalized = normalizeScannedPayload(aiOutcome.data);

        // Server-side duplicate detection against recent user transactions
        let possibleDuplicate: {
            id: string;
            description: string;
            amount: number;
            date: string;
            reason: string;
        } | null = null;

        try {
            const anchor = normalized.date ? new Date(`${normalized.date}T12:00:00`) : new Date();
            const safeAnchor = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
            const rangeStart = new Date(safeAnchor);
            rangeStart.setDate(rangeStart.getDate() - 4);
            const rangeEnd = new Date(safeAnchor);
            rangeEnd.setDate(rangeEnd.getDate() + 4);

            const { data: candidates } = await supabase
                .from("transactions")
                .select("id, amount, description, notes, transaction_date, transaction_type, metadata")
                .eq("user_id", user.id)
                .gte("transaction_date", rangeStart.toISOString())
                .lte("transaction_date", rangeEnd.toISOString())
                .limit(50);

            const cleanOp = normalized.operationNumber
                ? normalized.operationNumber.replace(/[^a-zA-Z0-9]/g, "")
                : "";

            for (const tx of candidates || []) {
                const txMetaOp = String((tx.metadata as any)?.operationNumber || "")
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .trim();
                const txNotes = String(tx.notes || "").replace(/[^a-zA-Z0-9]/g, "");
                const txDesc = String(tx.description || "").replace(/[^a-zA-Z0-9]/g, "");

                if (
                    cleanOp.length >= 4 &&
                    ((txMetaOp && txMetaOp === cleanOp) ||
                        txNotes.includes(cleanOp) ||
                        txDesc.includes(cleanOp))
                ) {
                    possibleDuplicate = {
                        id: tx.id,
                        description: tx.description || "Movimiento registrado",
                        amount: Number(tx.amount || 0),
                        date: tx.transaction_date,
                        reason: `Mismo Nro. de operación (${normalized.operationNumber})`,
                    };
                    break;
                }

                const txDay = String(tx.transaction_date || "").slice(0, 10);
                if (
                    normalized.amount &&
                    normalized.date &&
                    txDay === normalized.date &&
                    tx.transaction_type === normalized.transactionType &&
                    Math.abs(Number(tx.amount || 0) - normalized.amount) <= 0.01
                ) {
                    possibleDuplicate = {
                        id: tx.id,
                        description: tx.description || "Movimiento registrado",
                        amount: Number(tx.amount || 0),
                        date: tx.transaction_date,
                        reason: `Mismo monto (${normalized.currency} ${normalized.amount.toFixed(2)}) y fecha (${normalized.date})`,
                    };
                    break;
                }
            }
        } catch (dupErr) {
            console.warn("[SCAN_RECEIPT_DUP_CHECK]", dupErr);
        }

        return NextResponse.json({
            ...normalized,
            provider: aiOutcome.provider,
            possibleDuplicate,
        });
    } catch (error: any) {
        if (
            error &&
            (error.digest === "DYNAMIC_SERVER_USAGE" ||
                (error.message && error.message.includes("Dynamic server usage")) ||
                String(error).includes("Dynamic server usage") ||
                String(error).includes("cookies") ||
                String(error).includes("next/headers"))
        ) {
            throw error;
        }

        console.error("Error processing receipt with AI:", error);
        const errorMessage = error?.message || String(error);

        return NextResponse.json(
            {
                error: "Error procesando el comprobante con IA",
                details: errorMessage,
            },
            { status: 500 }
        );
    }
}
