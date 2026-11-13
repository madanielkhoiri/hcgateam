const DEFAULT_QUALITY = 0.75;
const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_MAX_HEIGHT = 1920;

function changeExtension(filename: string, extension: string): string {
  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, "");
  return `${nameWithoutExtension}.${extension}`;
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
  type: string,
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
      type,
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

  // Beberapa browser (mis. Safari iOS) belum bisa encode WebP dan diam-diam
  // mengembalikan PNG. Pakai tipe hasil sebenarnya supaya nama/ekstensi/MIME
  // file cocok dengan isinya, dan fallback ke JPEG bila WebP tidak didukung.
  let compressedBlob = await canvasToBlob(canvas, quality, "image/webp");

  if (compressedBlob.type !== "image/webp") {
    compressedBlob = await canvasToBlob(canvas, quality, "image/jpeg");
  }

  const outputType = compressedBlob.type === "image/webp" ? "image/webp" : "image/jpeg";
  const outputExtension = outputType === "image/webp" ? "webp" : "jpg";

  return new File([compressedBlob], changeExtension(file.name, outputExtension), {
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
