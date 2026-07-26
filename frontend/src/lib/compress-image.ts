const DEFAULT_QUALITY = 0.75;
const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1920;

function changeExtensionToWebp(filename: string): string {
  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, "");
  return `${nameWithoutExtension}.webp`;
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
      reject(new Error(`Foto ${file.name} gagal dibaca`));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Foto gagal dikompres"));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

export async function compressImage(
  file: File,
  quality = DEFAULT_QUALITY,
  maxWidth = DEFAULT_MAX_WIDTH,
  maxHeight = DEFAULT_MAX_HEIGHT,
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} bukan file gambar`);
  }

  const image = await loadImage(file);

  let width = image.naturalWidth;
  let height = image.naturalHeight;

  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const scale = Math.min(widthRatio, heightRatio, 1);

  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Browser gagal menyiapkan kompresi foto");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  const compressedBlob = await canvasToBlob(canvas, quality);

  return new File([compressedBlob], changeExtensionToWebp(file.name), {
    type: "image/webp",
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
