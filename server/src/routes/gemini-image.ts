import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = Router();

const VALID_ASPECT_RATIOS = ['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9'];
const VALID_IMAGE_SIZES = ['512','1K','2K','4K'];

const upload = multer({
  dest: '/tmp/gemini-uploads/',
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Images only'));
    cb(null, true);
  }
});

function getOutputDir(clientId?: string): string {
  const base = path.resolve(process.cwd(), 'uploads');
  const dir = clientId ? path.join(base, clientId) : path.join(base, 'gemini-output');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// POST /api/gemini/enhance — edit an existing media file with aesthetic prompt
router.post('/enhance', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'GOOGLE_API_KEY not configured' });

    const { prompt, clientId, mediaId, aspectRatio = '4:5' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    // Validate
    const ar = aspectRatio || '4:5';
    if (!VALID_ASPECT_RATIOS.includes(ar)) {
      return res.status(400).json({ error: `Invalid aspect_ratio. Valid: ${VALID_ASPECT_RATIOS.join(', ')}` });
    }

    const ai = new GoogleGenAI({ apiKey });

    function loadImagePart(imgPath: string) {
      const imgData = fs.readFileSync(imgPath);
      const ext = path.extname(imgPath).toLowerCase();
      const mimeMap: Record<string,string> = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp' };
      const mime = mimeMap[ext] || 'image/jpeg';
      return { inlineData: { mimeType: mime, data: imgData.toString('base64') } };
    }

    let contents: any[];

    if (req.body.imagePath && req.body.ambientPath) {
      // Dual image: ambient + food → compose together
      const foodPart = loadImagePart(req.body.imagePath);
      const ambientPart = loadImagePart(req.body.ambientPath);
      contents = [
        { text: prompt },
        ambientPart,
        foodPart,
      ];
    } else if (req.file) {
      const imgData = fs.readFileSync(req.file.path);
      const b64 = imgData.toString('base64');
      contents = [
        { text: prompt },
        { inlineData: { mimeType: req.file.mimetype, data: b64 } }
      ];
    } else if (req.body.imagePath) {
      contents = [
        { text: prompt },
        loadImagePart(req.body.imagePath),
      ];
    } else {
      return res.status(400).json({ error: 'image file or imagePath required' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      } as any,
    });

    // Parse response
    let text = '';
    let imageUrl: string | null = null;

    const parts = (response as any).candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) text += part.text;
      if (part.inlineData?.data) {
        const outDir = getOutputDir(clientId);
        const filename = `gemini-${uuidv4()}.png`;
        const outPath = path.join(outDir, filename);
        const buf = Buffer.from(part.inlineData.data, 'base64');
        fs.writeFileSync(outPath, buf);
        imageUrl = clientId
          ? `/uploads/${clientId}/${filename}`
          : `/uploads/gemini-output/${filename}`;
      }
    }

    // Cleanup temp
    if (req.file) fs.unlinkSync(req.file.path);

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image returned from Gemini', text });
    }

    // Save to DB with 'ai' category
    let dbRecord = null;
    if (clientId) {
      try {
        const filename = imageUrl.split('/').pop() || 'gemini-output.png';
        const filePath = path.join(getOutputDir(clientId), filename);
        const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
        dbRecord = await prisma.clientMedia.create({
          data: { clientId, filename, mimeType: 'image/png', size: fileSize, url: imageUrl, category: 'ai', tags: 'gemini,enhanced', notes: prompt.substring(0, 100) }
        });
      } catch {}
    }

    res.json({ success: true, model: 'gemini-3.1-flash-image-preview', text, image_url: imageUrl, clientId, mediaId, dbId: dbRecord?.id });

  } catch (e: any) {
    if (req.file) try { fs.unlinkSync(req.file.path); } catch {}
    console.error('[Gemini enhance]', e.message);
    res.status(500).json({ error: e.message || 'Gemini error' });
  }
});

// POST /api/gemini/generate — generate image from text prompt only
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'GOOGLE_API_KEY not configured' });

    const { prompt, clientId, aspectRatio = '4:5', imageSize = '2K' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt required' });

    if (!VALID_ASPECT_RATIOS.includes(aspectRatio)) {
      return res.status(400).json({ error: `Invalid aspect_ratio. Valid: ${VALID_ASPECT_RATIOS.join(', ')}` });
    }
    if (!VALID_IMAGE_SIZES.includes(imageSize)) {
      return res.status(400).json({ error: `Invalid image_size. Valid: ${VALID_IMAGE_SIZES.join(', ')}` });
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: [{ text: prompt }],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      } as any,
    });

    let text = '';
    let imageUrl: string | null = null;

    const parts = (response as any).candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) text += part.text;
      if (part.inlineData?.data) {
        const outDir = getOutputDir(clientId);
        const filename = `gemini-${uuidv4()}.png`;
        const outPath = path.join(outDir, filename);
        const buf = Buffer.from(part.inlineData.data, 'base64');
        fs.writeFileSync(outPath, buf);
        imageUrl = clientId
          ? `/uploads/${clientId}/${filename}`
          : `/uploads/gemini-output/${filename}`;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image returned from Gemini', text });
    }

    res.json({ success: true, model: 'gemini-2.0-flash-preview-image-generation', text, image_url: imageUrl, clientId });

  } catch (e: any) {
    console.error('[Gemini generate]', e.message);
    res.status(500).json({ error: e.message || 'Gemini error' });
  }
});

export default router;
