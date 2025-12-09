// src/lib/file-storage.ts
// Enterprise-grade file storage service for PDF documents

import fs from 'fs/promises';
import path from 'path';
import { validateTrainingCode } from './validation-schemas';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Get the base file storage path from environment variable
 * Development: ./uploads (relative to project root)
 * Production: C:\AeroLMSFiles (absolute path on server)
 */
export function getFileStoragePath(): string {
  return process.env.FILE_STORAGE_PATH || './uploads';
}

/**
 * Maximum file size in bytes (default: 200MB)
 */
export function getMaxFileSize(): number {
  const maxSizeMB = parseInt(process.env.FILE_MAX_SIZE_MB || '200', 10);
  return maxSizeMB * 1024 * 1024;
}

// ============================================================================
// Path Generation
// ============================================================================

/**
 * Generate a unique filename for PDF storage
 * Pattern: content-{YYYYMMDD}-{HHmmss}-{uuid4short}.pdf
 */
export function generatePdfFileName(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = now.toISOString().slice(11, 19).replace(/:/g, '');
  const uuid = crypto.randomUUID().slice(0, 8);
  return `content-${dateStr}-${timeStr}-${uuid}.pdf`;
}

/**
 * Get the directory path for a trainer's PDF in a training
 * Structure: {basePath}/trainings/{trainingCode}/{trainerId}/
 */
export function getTrainingPdfDirectory(
  trainingCode: string,
  trainerId: number
): string {
  // Validate training code to prevent path traversal
  validateTrainingCode(trainingCode);

  const basePath = getFileStoragePath();
  return path.join(basePath, 'trainings', trainingCode, String(trainerId));
}

/**
 * Get the full path for a PDF file
 */
export function getFullPdfPath(
  trainingCode: string,
  trainerId: number,
  fileName: string
): string {
  const directory = getTrainingPdfDirectory(trainingCode, trainerId);
  // Validate filename contains no path separators (security)
  if (
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName.includes('..')
  ) {
    throw new Error('Invalid filename: path traversal detected');
  }
  return path.join(directory, fileName);
}

/**
 * Get the archive path for deleted files
 * Structure: {basePath}/archive/{year}/{month}/deleted_{originalName}_{timestamp}.pdf
 */
export function getArchivePath(originalFileName: string): string {
  const basePath = getFileStoragePath();
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const timestamp = now.getTime();
  const archiveFileName = `deleted_${originalFileName}_${timestamp}.pdf`;
  return path.join(basePath, 'archive', year, month, archiveFileName);
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error: any) {
    if (error.code !== 'EEXIST') {
      throw new Error(
        `Failed to create directory ${dirPath}: ${error.message}`
      );
    }
  }
}

/**
 * Save a PDF file to the storage
 * Returns the generated filename
 */
export async function savePdfFile(
  trainingCode: string,
  trainerId: number,
  fileBuffer: Buffer,
  originalName: string
): Promise<{ fileName: string; fileSize: number }> {
  // Validate PDF magic bytes
  if (!validatePdfMagicBytes(fileBuffer)) {
    throw new Error('Invalid PDF file: magic bytes check failed');
  }

  // Validate file size
  const maxSize = getMaxFileSize();
  if (fileBuffer.length > maxSize) {
    throw new Error(
      `File size exceeds maximum allowed (${Math.round(maxSize / 1024 / 1024)}MB)`
    );
  }

  // Generate filename and path
  const fileName = generatePdfFileName();
  const directory = getTrainingPdfDirectory(trainingCode, trainerId);
  const fullPath = path.join(directory, fileName);

  // Ensure directory exists
  await ensureDirectory(directory);

  // Write file
  await fs.writeFile(fullPath, fileBuffer);

  return {
    fileName,
    fileSize: fileBuffer.length
  };
}

/**
 * Read a PDF file from storage
 */
export async function readPdfFile(
  trainingCode: string,
  trainerId: number,
  fileName: string
): Promise<Buffer> {
  const fullPath = getFullPdfPath(trainingCode, trainerId, fileName);

  try {
    const buffer = await fs.readFile(fullPath);
    return buffer;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error('PDF file not found');
    }
    throw new Error(`Failed to read PDF file: ${error.message}`);
  }
}

/**
 * Delete a PDF file (moves to archive for audit trail)
 */
export async function deletePdfFile(
  trainingCode: string,
  trainerId: number,
  fileName: string,
  archiveInsteadOfDelete: boolean = true
): Promise<void> {
  const fullPath = getFullPdfPath(trainingCode, trainerId, fileName);

  try {
    if (archiveInsteadOfDelete) {
      // Move to archive instead of permanent deletion
      const archivePath = getArchivePath(fileName);
      const archiveDir = path.dirname(archivePath);
      await ensureDirectory(archiveDir);
      await fs.rename(fullPath, archivePath);
    } else {
      // Permanent deletion
      await fs.unlink(fullPath);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - consider it already deleted
      return;
    }
    throw new Error(`Failed to delete PDF file: ${error.message}`);
  }
}

/**
 * Check if a PDF file exists
 */
export async function pdfFileExists(
  trainingCode: string,
  trainerId: number,
  fileName: string
): Promise<boolean> {
  const fullPath = getFullPdfPath(trainingCode, trainerId, fileName);

  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate PDF magic bytes (first 4 bytes should be %PDF)
 * This prevents uploading of non-PDF files with .pdf extension
 */
export function validatePdfMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) {
    return false;
  }

  // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
  const pdfMagic = Buffer.from([0x25, 0x50, 0x44, 0x46]);
  return buffer.subarray(0, 4).equals(pdfMagic);
}

/**
 * Validate MIME type is application/pdf
 */
export function validatePdfMimeType(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Sanitize original filename (remove path components, dangerous characters)
 */
export function sanitizeFileName(originalName: string): string {
  // Remove path components
  let name = originalName.replace(/^.*[\\\/]/, '');

  // Remove or replace dangerous characters
  name = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');

  // Ensure reasonable length
  if (name.length > 255) {
    const ext = path.extname(name);
    const baseName = path.basename(name, ext);
    name = baseName.slice(0, 255 - ext.length) + ext;
  }

  return name;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PdfFileInfo {
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy: number;
}

export interface PdfUploadResult {
  success: boolean;
  fileName?: string;
  originalName?: string;
  fileSize?: number;
  error?: string;
}
