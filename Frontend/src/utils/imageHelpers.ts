import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "./constants";

export const processImageFile = (
  file: File,
  setImage: (file: File) => void,
  setImagePreview: (preview: string | ArrayBuffer | null) => void,
  setImageError: (err: string) => void
): boolean => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    setImageError("Invalid file type. Only PNG, JPG, JPEG, and WebP images are allowed.");
    return false;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    setImageError("File size exceeds 10MB limit.");
    return false;
  }

  setImageError("");
  setImage(file);

  const reader = new FileReader();

  reader.onload = (event) => {
    setImagePreview(event.target?.result ?? null);
  };
  reader.readAsDataURL(file);
  return true;
};

export const processImageFiles = (
  files: File[],
  currentImagesCount: number,
  addImage: (file: File) => void,
  addImagePreview: (preview: string | ArrayBuffer | null) => void,
  setImageError: (err: string) => void,
  maxImages = 2
): boolean => {
  if (currentImagesCount + files.length > maxImages) {
    if (setImageError)
      setImageError(
        `Only up to ${maxImages} ${maxImages === 1 ? "image is" : "images are"} allowed to upload.`
      );
    return false;
  }

  files.forEach((file) => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      if (setImageError)
        setImageError("Invalid file type. Only PNG, JPG, JPEG, and WebP images are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      if (setImageError) setImageError("File size exceeds 10MB limit.");
      return;
    }

    addImage(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      addImagePreview(event.target?.result ?? null);
    };
    reader.readAsDataURL(file);
  });
  return true;
};
