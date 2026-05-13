import { LISTING_IMAGE_MAX_BYTES } from '@sellr/shared';
import { describe, expect, it } from 'vitest';
import {
  LISTING_HEIC_MAX_BYTES,
  LISTING_IMAGE_ACCEPT,
  isHeicImageFile,
  isSupportedListingImageFile,
  listingImageFileIssue,
  prepareListingImageFile,
} from './listing-image-files';

function imageFile(name: string, type: string, size: number) {
  return { name, type, size };
}

describe('listing image file helpers', () => {
  it('allows iPhone HEIC and HEIF files by MIME type or extension', () => {
    expect(isHeicImageFile(imageFile('photo.heic', '', 1000))).toBe(true);
    expect(isHeicImageFile(imageFile('photo.jpg', 'image/heif', 1000))).toBe(
      true,
    );
    expect(LISTING_IMAGE_ACCEPT).toContain('.heic');
    expect(LISTING_IMAGE_ACCEPT).toContain('image/heif');
  });

  it('allows browser-supported listing images even when MIME type is missing', () => {
    expect(isSupportedListingImageFile(imageFile('photo.jpg', '', 1000))).toBe(
      true,
    );
    expect(
      isSupportedListingImageFile(imageFile('photo.webp', 'image/webp', 1000)),
    ).toBe(true);
  });

  it('normalizes extension-backed image files before upload', async () => {
    const file = new File(['image-bytes'], 'photo.jpg', {
      type: 'application/octet-stream',
    });

    const prepared = await prepareListingImageFile(file);

    expect(prepared.name).toBe('photo.jpg');
    expect(prepared.type).toBe('image/jpeg');
  });

  it('returns user-facing issues for unsupported or oversized images', () => {
    expect(listingImageFileIssue(imageFile('photo.gif', 'image/gif', 1000))).toBe(
      'Upload JPG, PNG, WebP, or iPhone HEIC photos.',
    );
    expect(
      listingImageFileIssue(
        imageFile('photo.jpg', 'image/jpeg', LISTING_IMAGE_MAX_BYTES + 1),
      ),
    ).toBe('Keep each image under 3 MB.');
    expect(
      listingImageFileIssue(
        imageFile('photo.heic', 'image/heic', LISTING_HEIC_MAX_BYTES + 1),
      ),
    ).toBe('Choose an iPhone HEIC photo under 12 MB.');
  });
});
