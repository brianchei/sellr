import {
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_MIME_TYPES,
} from '@sellr/shared';

const LISTING_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
const LISTING_HEIC_EXTENSIONS = ['.heic', '.heif'] as const;
const LISTING_HEIC_MIME_TYPES = [
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
] as const;

const LISTING_IMAGE_MAX_EDGE_PX = 1800;
export const LISTING_HEIC_MAX_BYTES = 12 * 1024 * 1024;
export const LISTING_IMAGE_ACCEPT = [
  ...LISTING_IMAGE_MIME_TYPES,
  ...LISTING_IMAGE_EXTENSIONS,
  ...LISTING_HEIC_MIME_TYPES,
  ...LISTING_HEIC_EXTENSIONS,
].join(',');

type ImageFileLike = Pick<File, 'name' | 'type' | 'size'>;

function extensionFor(filename: string): string {
  const normalized = filename.trim().toLowerCase();
  const index = normalized.lastIndexOf('.');
  return index >= 0 ? normalized.slice(index) : '';
}

function mimeTypeForExtension(filename: string): string | null {
  const extension = extensionFor(filename);
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return null;
}

function convertedFilename(filename: string): string {
  const clean = filename.trim() || 'listing-photo';
  const extensionIndex = clean.lastIndexOf('.');
  const base = extensionIndex > 0 ? clean.slice(0, extensionIndex) : clean;
  return `${base}.jpg`;
}

function targetImageSize(width: number, height: number) {
  const largestEdge = Math.max(width, height);
  if (largestEdge <= LISTING_IMAGE_MAX_EDGE_PX) {
    return { width, height };
  }

  const scale = LISTING_IMAGE_MAX_EDGE_PX / largestEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Could not read this HEIC photo.'));
    };
    image.src = objectUrl;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not convert this HEIC photo.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.86,
    );
  });
}

export function isHeicImageFile(file: Pick<ImageFileLike, 'name' | 'type'>) {
  return (
    LISTING_HEIC_MIME_TYPES.includes(
      file.type as (typeof LISTING_HEIC_MIME_TYPES)[number],
    ) ||
    LISTING_HEIC_EXTENSIONS.includes(
      extensionFor(file.name) as (typeof LISTING_HEIC_EXTENSIONS)[number],
    )
  );
}

export function isSupportedListingImageFile(
  file: Pick<ImageFileLike, 'name' | 'type'>,
) {
  return (
    LISTING_IMAGE_MIME_TYPES.includes(
      file.type as (typeof LISTING_IMAGE_MIME_TYPES)[number],
    ) || Boolean(mimeTypeForExtension(file.name))
  );
}

export function listingImageFileIssue(file: ImageFileLike): string | null {
  if (isHeicImageFile(file)) {
    if (file.size > LISTING_HEIC_MAX_BYTES) {
      return 'Choose an iPhone HEIC photo under 12 MB.';
    }
    return null;
  }

  if (!isSupportedListingImageFile(file)) {
    return 'Upload JPG, PNG, WebP, or iPhone HEIC photos.';
  }

  if (file.size > LISTING_IMAGE_MAX_BYTES) {
    return 'Keep each image under 3 MB.';
  }

  return null;
}

export async function prepareListingImageFile(file: File): Promise<File> {
  if (!isHeicImageFile(file)) {
    const inferredType = mimeTypeForExtension(file.name);
    const hasSupportedMimeType = LISTING_IMAGE_MIME_TYPES.includes(
      file.type as (typeof LISTING_IMAGE_MIME_TYPES)[number],
    );
    if (!hasSupportedMimeType && inferredType) {
      return new File([file], file.name, {
        type: inferredType,
        lastModified: file.lastModified,
      });
    }
    return file;
  }

  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const { width, height } = targetImageSize(
    image.naturalWidth,
    image.naturalHeight,
  );
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not convert this HEIC photo.');
  }

  context.drawImage(image, 0, 0, width, height);
  const blob = await canvasToJpegBlob(canvas);
  if (blob.size > LISTING_IMAGE_MAX_BYTES) {
    throw new Error('Converted photo is still over 3 MB.');
  }

  return new File([blob], convertedFilename(file.name), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}
