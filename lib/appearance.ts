/** Opciones de apariencia disponibles en Ajustes (única fuente de verdad). */

export const ACCENT_COLORS = [
    { name: "Violeta Lumio", value: "#7C3AED" },
    { name: "Índigo", value: "#6366F1" },
    { name: "Azul cielo", value: "#0EA5E9" },
    { name: "Esmeralda", value: "#10B981" },
    { name: "Rosa", value: "#F43F5E" },
    { name: "Ámbar", value: "#F59E0B" },
]

export const FONT_STACKS: Record<string, string> = {
    Outfit: "'Outfit', system-ui, sans-serif",
    Inter: "'Inter', system-ui, sans-serif",
    "Plus Jakarta Sans": "'Plus Jakarta Sans', system-ui, sans-serif",
    Montserrat: "'Montserrat', system-ui, sans-serif",
}

export const FONT_OPTIONS = [
    { name: "Outfit", description: "Suave, moderno y redondeado" },
    { name: "Inter", description: "Clara y muy legible" },
    { name: "Plus Jakarta Sans", description: "Elegante y amigable" },
    { name: "Montserrat", description: "Firme y geométrica" },
]
