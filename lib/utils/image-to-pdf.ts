/**
 * Converts an image file to PDF using jsPDF
 * Optimized for receipt/invoice scanning
 */

import { jsPDF } from 'jspdf'

interface ConversionOptions {
    quality?: number // 0-1, default 0.85
    maxWidth?: number // Max width in pixels, default 1200
    filename?: string // Output filename without extension
}

/**
 * Converts an image (from camera or file) to a PDF blob
 */
export async function imageToPdf(
    imageFile: File,
    options: ConversionOptions = {}
): Promise<{ blob: Blob; filename: string }> {
    const {
        quality = 0.85,
        maxWidth = 1200,
        filename = `comprobante_${Date.now()}`
    } = options

    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = async (e) => {
            try {
                const img = new Image()
                img.onload = () => {
                    // Calculate dimensions maintaining aspect ratio
                    let width = img.width
                    let height = img.height

                    // Resize if too large
                    if (width > maxWidth) {
                        const ratio = maxWidth / width
                        width = maxWidth
                        height = height * ratio
                    }

                    // Convert pixels to mm (assuming 96 DPI)
                    const pxToMm = 0.264583
                    const widthMm = width * pxToMm
                    const heightMm = height * pxToMm

                    // Create PDF with custom size matching image
                    const pdf = new jsPDF({
                        orientation: width > height ? 'landscape' : 'portrait',
                        unit: 'mm',
                        format: [widthMm, heightMm]
                    })

                    // Add image to PDF
                    const imgData = e.target?.result as string
                    pdf.addImage(imgData, 'JPEG', 0, 0, widthMm, heightMm, undefined, 'MEDIUM')

                    // Add metadata
                    pdf.setProperties({
                        title: filename,
                        subject: 'Comprobante de Caja Chica',
                        creator: 'Lumio Finance',
                        author: 'Sistema de Caja Chica'
                    })

                    // Get PDF as blob
                    const pdfBlob = pdf.output('blob')

                    resolve({
                        blob: pdfBlob,
                        filename: `${filename}.pdf`
                    })
                }

                img.onerror = () => {
                    reject(new Error('Error al cargar la imagen'))
                }

                img.src = e.target?.result as string
            } catch (error) {
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

                reject(error)
            }
        }

        reader.onerror = () => {
            reject(new Error('Error al leer el archivo'))
        }

        reader.readAsDataURL(imageFile)
    })
}

/**
 * Compresses an image before conversion
 */
export async function compressImage(
    file: File,
    maxWidth: number = 1200,
    quality: number = 0.8
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = (e) => {
            const img = new Image()

            img.onload = () => {
                const canvas = document.createElement('canvas')
                let width = img.width
                let height = img.height

                // Resize if needed
                if (width > maxWidth) {
                    const ratio = maxWidth / width
                    width = maxWidth
                    height = height * ratio
                }

                canvas.width = width
                canvas.height = height

                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    reject(new Error('No se pudo crear el contexto del canvas'))
                    return
                }

                // Draw with white background (for transparency)
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, width, height)
                ctx.drawImage(img, 0, 0, width, height)

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob)
                        } else {
                            reject(new Error('Error al comprimir imagen'))
                        }
                    },
                    'image/jpeg',
                    quality
                )
            }

            img.onerror = () => reject(new Error('Error al cargar imagen'))
            img.src = e.target?.result as string
        }

        reader.onerror = () => reject(new Error('Error al leer archivo'))
        reader.readAsDataURL(file)
    })
}

/**
 * Checks if a file is an image
 */
export function isImageFile(file: File): boolean {
    return file.type.startsWith('image/')
}

/**
 * Checks if a file is already a PDF
 */
export function isPdfFile(file: File): boolean {
    return file.type === 'application/pdf'
}

/**
 * Generates a filename for the receipt based on date and optional vendor
 */
export function generateReceiptFilename(vendor?: string): string {
    const date = new Date()
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '')
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '').slice(0, 4)

    if (vendor) {
        // Sanitize vendor name
        const sanitizedVendor = vendor
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .slice(0, 20)
        return `comprobante_${sanitizedVendor}_${dateStr}_${timeStr}`
    }

    return `comprobante_${dateStr}_${timeStr}`
}
