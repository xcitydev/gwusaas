import sharp from "sharp";

export interface CollageOptions {
  images: string[];
  columns?: number;
  cellWidth?: number;
  cellHeight?: number;
  gap?: number;
  background?: { r: number; g: number; b: number };
  caption?: string;
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Failed to fetch image: ${url.slice(0, 80)}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function createCollage(opts: CollageOptions): Promise<Buffer> {
  const {
    images,
    columns = Math.min(opts.images.length, 3),
    cellWidth = 400,
    cellHeight = 300,
    gap = 8,
    background = { r: 20, g: 20, b: 20 },
  } = opts;

  if (images.length === 0) throw new Error("No images provided for collage");

  const rows = Math.ceil(images.length / columns);
  const totalWidth = columns * cellWidth + (columns + 1) * gap;
  const totalHeight = rows * cellHeight + (rows + 1) * gap;

  const canvas = sharp({
    create: { width: totalWidth, height: totalHeight, channels: 3, background },
  });

  const cellBuffers = await Promise.all(
    images.map(async (url) => {
      try {
        const buf = await fetchImageBuffer(url);
        return await sharp(buf).resize(cellWidth, cellHeight, { fit: "cover", position: "centre" }).toBuffer();
      } catch {
        return await sharp({
          create: { width: cellWidth, height: cellHeight, channels: 3, background: { r: 60, g: 60, b: 60 } },
        }).toBuffer();
      }
    })
  );

  const composites: sharp.OverlayOptions[] = cellBuffers.map((buf, i) => ({
    input: buf,
    left: gap + (i % columns) * (cellWidth + gap),
    top: gap + Math.floor(i / columns) * (cellHeight + gap),
  }));

  return canvas.composite(composites).jpeg({ quality: 90 }).toBuffer();
}

export async function addCaptionToImage(
  imageBuffer: Buffer,
  caption: string,
  position: "top" | "bottom" = "bottom"
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width ?? 800;
  const h = meta.height ?? 600;

  const barHeight = Math.max(60, Math.round(h * 0.1));
  const fontSize = Math.max(18, Math.round(barHeight * 0.4));
  const maxChars = Math.floor(w / (fontSize * 0.55));

  const words = caption.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());

  const finalBarHeight = lines.length * (fontSize + 8) + 16;
  const svgText = `<svg width="${w}" height="${finalBarHeight}">
    <rect width="${w}" height="${finalBarHeight}" fill="rgba(0,0,0,0.72)" />
    ${lines.map((line, i) => `<text x="${w / 2}" y="${16 + i * (fontSize + 8) + fontSize}" font-family="Arial, sans-serif" font-size="${fontSize}" fill="white" text-anchor="middle" dominant-baseline="auto">${line}</text>`).join("")}
  </svg>`;

  return sharp({
    create: { width: w, height: h + finalBarHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
  })
    .composite([
      { input: imageBuffer, top: position === "bottom" ? 0 : finalBarHeight, left: 0 },
      { input: Buffer.from(svgText), top: position === "bottom" ? h : 0, left: 0 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}
