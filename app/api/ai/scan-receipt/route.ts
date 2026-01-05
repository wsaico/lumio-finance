import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json(
                { error: "Se requiere una imagen en base64" },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is missing in environment variables");
            return NextResponse.json(
                { error: "Configuración incompleta: Falta la API Key de Gemini" },
                { status: 500 }
            );
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);
        // Using strict stable version to avoid beta aliases which fail with 404 on some keys
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });

        const prompt = `
      Analiza esta imagen de un recibo, factura o boleta de pago. Extrae la siguiente información en formato JSON estrictamente:
      
      {
        "amount": number (monto total, solo números),
        "date": string (fecha en formato YYYY-MM-DD),
        "vendor": string (nombre del proveedor o establecimiento),
        "receiptNumber": string (número de serie/comprobante si es visible),
        "receiptType": string (uno de: "FACTURA", "BOLETA", "RECIBO", "TICKET", "OTRO"),
        "description": string (breve descripción sugerida del gasto basada en los ítems),
        "taxAmount": number (monto del IGV/impuesto si es visible, o 0)
      }

      Si algún campo no es visible o no se puede determinar, usa null o una cadena vacía, pero trata de inferir lo más posible. 
      La descripción debe ser concisa (ej: "Consumo en restaurante", "Compra de útiles", "Servicio de taxi").
      Para receiptType, si ves un RUC y dice FACTURA, usa FACTURA. Si es un ticket simple, usa TICKET o BOLETA según corresponda.
    `;

        // Extract mimeType and base64 data
        // Format: "data:image/jpeg;base64,/9j/4AAQSk..."
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);

        let mimeType = "image/jpeg"; // default
        let base64Data = image;

        if (matches && matches.length === 3) {
            mimeType = matches[1];
            base64Data = matches[2];
        } else {
            // Fallback for raw base64 without header (assume jpeg if not provided)
            base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        }

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                },
            },
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        let data;
        try {
            data = JSON.parse(cleanText);
        } catch (e) {
        // Next.js dynamic usage e detection - MUST re-throw immediately and silently
        if (e && (
            e.digest === 'DYNAMIC_SERVER_USAGE' || 
            (e.message && e.message.includes('Dynamic server usage')) ||
            (String(e).includes('Dynamic server usage')) ||
            (String(e).includes('cookies')) ||
            (String(e).includes('next/headers'))
        )) {
            throw e;
        }

            console.error("Error parsing Gemini response:", text);
            return NextResponse.json(
                { error: "No se pudo interpretar la respuesta de la IA" },
                { status: 500 }
            );
        }

        return NextResponse.json(data);

    } catch (error: any) {
        // Next.js dynamic usage error detection - MUST re-throw immediately and silently
        if (error && (
            error.digest === 'DYNAMIC_SERVER_USAGE' || 
            (error.message && error.message.includes('Dynamic server usage')) ||
            (String(error).includes('Dynamic server usage')) ||
            (String(error).includes('cookies')) ||
            (String(error).includes('next/headers'))
        )) {
            throw error;
        }

        console.error("Error processing receipt with AI:", error);

        // Extract inner error message if possible
        const errorMessage = error.message || error.toString();
        const errorDetails = error.response ? JSON.stringify(error.response) : "";

        return NextResponse.json(
            {
                error: "Error procesando el recibo con IA",
                details: `${errorMessage} ${errorDetails}`.trim()
            },
            { status: 500 }
        );
    }
}
