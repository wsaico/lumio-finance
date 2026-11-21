import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OpenGraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "64px",
                    background: "linear-gradient(135deg, #0F1018 0%, #2E1065 55%, #5B21B6 100%)",
                    color: "#FFFFFF",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div
                        style={{
                            width: "52px",
                            height: "52px",
                            borderRadius: "16px",
                            background: "#7C3AED",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "28px",
                            fontWeight: 900,
                        }}
                    >
                        L
                    </div>
                    <span style={{ fontSize: "28px", fontWeight: 800 }}>Lumio Finance</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "900px" }}>
                    <div style={{ fontSize: "56px", fontWeight: 900, lineHeight: 1.08 }}>
                        Claridad exacta para tus cuentas, tarjetas, presupuestos y metas.
                    </div>
                    <div style={{ fontSize: "26px", color: "#DDD6FE" }}>
                        15 días Premium gratis sin tarjeta · Plan Básico gratis de por vida
                    </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", color: "#C4B5FD" }}>
                    <span>Cuentas · Tarjetas · Presupuestos · Préstamos · Reportes</span>
                    <span>esaico.com</span>
                </div>
            </div>
        ),
        { ...size }
    )
}
