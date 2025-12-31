/**
 * Server-side utility to convert images to PDF
 * Uses sharp for image processing and PDFKit for PDF generation
 */

import sharp from 'sharp'
import PDFDocument from 'pdfkit'

interface ConversionOptions {
    quality?: number // JPEG quality 1-100, default 85
    maxWidth?: number // Max width in pixels, default 1200
    filename?: string // Base filename without extension
    vendor?: string // Vendor name for metadata
}

interface ConversionResult {
    buffer: Buffer
    filename: string
    mimeType: string
    size: number
}

/**
 * Converts an image buffer to a PDF buffer
 */
export async function imageToPdf(
    imageBuffer: Buffer,
    originalMimeType: string,
    options: ConversionOptions = {}
): Promise<ConversionResult> {
    const {
        quality = 85,
        maxWidth = 1200,
        filename = generateFilename(options.vendor),
    } = options

    // Process image with sharp - optimize and get metadata
    const image = sharp(imageBuffer)
    const metadata = await image.metadata()

    console.log('[IMAGE_TO_PDF] Image metadata:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
    })

    // Calculate dimensions
    let width = metadata.width || 800
    let height = metadata.height || 600

    // Resize if too large
    if (width > maxWidth) {
        const ratio = maxWidth / width
        width = maxWidth
        height = Math.round(height * ratio)
    }

    // Convert to JPEG buffer (optimized)
    const processedImage = await image
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer()

    // Create PDF with image dimensions
    // Convert pixels to points (72 points per inch, assuming 96 DPI)
    const pxToPoints = 72 / 96
    const pageWidth = width * pxToPoints
    const pageHeight = height * pxToPoints

    // Create PDF document
    const doc = new PDFDocument({
        size: [pageWidth, pageHeight],
        margin: 0,
        info: {
            Title: filename,
            Author: 'Lumio Finance - Caja Chica',
            Subject: 'Comprobante de Gasto',
            Keywords: 'comprobante, caja chica, gasto',
            CreationDate: new Date(),
            Creator: 'Lumio Finance',
            Producer: 'PDFKit'
        }
    })

    // Collect PDF chunks
    const chunks: Buffer[] = []

    return new Promise((resolve, reject) => {
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(chunks)
            resolve({
                buffer: pdfBuffer,
                filename: `${filename}.pdf`,
                mimeType: 'application/pdf',
                size: pdfBuffer.length
            })
        })
        doc.on('error', reject)

        // Add image to PDF
        doc.image(processedImage, 0, 0, {
            width: pageWidth,
            height: pageHeight
        })

        // Finalize the PDF
        doc.end()
    })
}

/**
 * Generates a filename based on date and optional vendor
 */
function generateFilename(vendor?: string): string {
    const now = new Date()
    const date = now.toISOString().split('T')[0].replace(/-/g, '')
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '').slice(0, 4)

    if (vendor) {
        const sanitized = vendor
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]/g, '_')
            .slice(0, 20)
        return `comprobante_${sanitized}_${date}_${time}`
    }

    return `comprobante_${date}_${time}`
}

/**
 * Checks if a file type is an image that can be converted
 */
export function isConvertibleImage(mimeType: string): boolean {
    const convertible = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif'
    ]
    return convertible.includes(mimeType.toLowerCase())
}

/**
 * Checks if file is already a PDF
 */
export function isPdf(mimeType: string): boolean {
    return mimeType.toLowerCase() === 'application/pdf'
}
