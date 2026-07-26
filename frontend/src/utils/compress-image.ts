const OUTPUT_QUALITY = 0.75;
const MAX_IMAGE_DIMENSION = 2200;

function replaceExtension(filename: string, extension: string): string {
  const cleanName = filename.replace(/\.[^.]+$/, "");

  return `${cleanName}.${extension}`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Gambar ${file.name} gagal dibaca`));
    };

    image.src = objectUrl;
  });
}

export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} bukan file gambar`);
  }

  const image = await loadImage(file);

  let width = image.naturalWidth;
  let height = image.naturalHeight;

  const longestSide = Math.max(width, height);

  if (longestSide > MAX_IMAGE_DIMENSION) {
    const scale = MAX_IMAGE_DIMENSION / longestSide;

    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Browser gagal memproses gambar");
  }

  context.drawImage(image, 0, 0, width, height);

  const preservePng = file.type === "image/png";

  const outputType = preservePng ? "image/png" : "image/jpeg";

  const outputExtension = preservePng ? "png" : "jpg";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
          return;
        }

        reject(new Error(`Gambar ${file.name} gagal dikompres`));
      },
      outputType,
      OUTPUT_QUALITY,
    );
  });

  return new File([blob], replaceExtension(file.name, outputExtension), {
    type: outputType,
    lastModified: Date.now(),
  });
}

export async function compressImages(files: File[]): Promise<File[]> {
  const results: File[] = [];

  for (const file of files) {
    results.push(await compressImage(file));
  }

  return results;
}
