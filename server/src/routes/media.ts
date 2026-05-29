/**
 * Client Media Library API
 * Upload, list, delete media assets per client
 */
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const router = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure uploads dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Multer config — store per client subfolder
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const clientDir = path.join(UPLOAD_DIR, req.params.clientId || 'unknown');
    if (!fs.existsSync(clientDir)) fs.mkdirSync(clientDir, { recursive: true });
    cb(null, clientDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /image\/(jpeg|jpg|png|gif|webp)|video\/(mp4|mov|quicktime)|application\/pdf/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error(`File type ${file.mimetype} not allowed`));
  },
});

// GET /api/media/:clientId — list all media for a client
router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const media = await prisma.clientMedia.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ media });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// POST /api/media/:clientId — upload files (multi-file support)
router.post('/:clientId', upload.array('files', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    const tags = (req.body.tags as string) || '';
    const notes = (req.body.notes as string) || '';

    // Auto-categorize by filename if no category provided
    function autoCategory(filename: string, mimetype: string): string {
      if (mimetype.startsWith('video')) return 'video';
      const f = filename.toLowerCase();
      if (f.includes('event') || f.includes('poster') || f.includes('promo') || f.includes('banquet') || f.includes('flyer') || f.includes('banner')) return 'events';
      if (f.includes('cake') || f.includes('dessert') || f.includes('medovik') || f.includes('pastry') || f.includes('sweet')) return 'desserts';
      if (f.includes('soup') || f.includes('borscht')) return 'soups';
      if (f.includes('salad') || f.includes('caesar') || f.includes('burrata') || f.includes('olivier') || f.includes('herring')) return 'salads';
      if (f.includes('interior') || f.includes('ambient') || f.includes('atmosphere') || f.includes('room') || f.includes('bar') || f.includes('hero') || f.includes('outside') || f.includes('facade')) return 'ambient';
      if (f.includes('owner') || f.includes('staff') || f.includes('team') || f.includes('chef')) return 'owner';
      if (f.includes('food') || f.includes('dish') || f.includes('menu') || f.includes('beef') || f.includes('chicken') || f.includes('meat') || f.includes('fish') || f.includes('blini') || f.includes('vareniki') || f.includes('pate') || f.includes('cutlet') || f.includes('stroganoff') || f.includes('kiev') || f.includes('caviar')) return 'food';
      return (req.body.category as string) || 'photo';
    }

    const created = await Promise.all(
      files.map(f =>
        prisma.clientMedia.create({
          data: {
            clientId: req.params.clientId,
            filename: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
            url: `/uploads/${req.params.clientId}/${f.filename}`,
            category: autoCategory(f.originalname, f.mimetype),
            tags,
            notes,
          },
        })
      )
    );

    res.json({ success: true, uploaded: created.length, media: created });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// PATCH /api/media/:clientId/:id — update tags/notes/category
router.patch('/:clientId/:id', async (req: Request, res: Response) => {
  try {
    const { tags, notes, category } = req.body;
    const updated = await prisma.clientMedia.update({
      where: { id: req.params.id },
      data: {
        ...(tags !== undefined && { tags }),
        ...(notes !== undefined && { notes }),
        ...(category !== undefined && { category }),
      },
    });
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// DELETE /api/media/:clientId/:id — delete a media file
router.delete('/:clientId/:id', async (req: Request, res: Response) => {
  try {
    const media = await prisma.clientMedia.findUnique({ where: { id: req.params.id } });
    if (!media) return res.status(404).json({ error: 'Not found' });

    // Delete file from disk
    const filePath = path.join(process.cwd(), media.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.clientMedia.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
