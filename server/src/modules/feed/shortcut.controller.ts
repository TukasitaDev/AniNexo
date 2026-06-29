import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

export async function createShortcut(req: Request, res: Response) {
  try {
    const { userId, name, imageUrl, targetType, targetId } = req.body;
    
    if (!userId || !targetType || !targetId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const shortcut = {
      id: require('crypto').randomUUID(),
      name: name || (targetType === 'ANIME' ? `Anime ${targetId}` : targetType === 'GROUP' ? `Grupo ${targetId}` : targetId),
      imageUrl,
      targetType,
      targetId: String(targetId)
    };

    const existing = await prisma.nexoMemory.findUnique({
      where: { userId_key: { userId: String(userId), key: 'shortcuts' } }
    });

    const shortcuts = existing?.value ? JSON.parse(String(existing.value)) : [];
    const updatedShortcuts = [...shortcuts, shortcut];

    await prisma.nexoMemory.upsert({
      where: { userId_key: { userId: String(userId), key: 'shortcuts' } },
      create: { userId: String(userId), key: 'shortcuts', value: JSON.stringify(updatedShortcuts) },
      update: { value: JSON.stringify(updatedShortcuts) }
    });

    return res.json({ success: true, data: shortcut });
  } catch (err) {
    console.error('Error creating shortcut:', err);
    return res.status(500).json({ success: false, message: 'Error creating shortcut' });
  }
}

export async function getUserShortcuts(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const existing = await prisma.nexoMemory.findUnique({
      where: { userId_key: { userId: String(userId), key: 'shortcuts' } }
    });

    const shortcuts = existing?.value ? JSON.parse(String(existing.value)) : [];

    return res.json({ success: true, data: shortcuts });
  } catch (err) {
    console.error('Error fetching shortcuts:', err);
    return res.status(500).json({ success: false, message: 'Error fetching shortcuts' });
  }
}

export async function deleteShortcut(req: Request, res: Response) {
  try {
    const { shortcutId } = req.params;
    const { userId } = req.body;

    const existing = await prisma.nexoMemory.findUnique({
      where: { userId_key: { userId: String(userId), key: 'shortcuts' } }
    });

    if (!existing?.value) {
      return res.json({ success: true });
    }

    const shortcuts = JSON.parse(String(existing.value));
    const updatedShortcuts = shortcuts.filter((s: any) => s.id !== shortcutId);

    await prisma.nexoMemory.update({
      where: { userId_key: { userId: String(userId), key: 'shortcuts' } },
      data: { value: JSON.stringify(updatedShortcuts) }
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Error deleting shortcut:', err);
    return res.status(500).json({ success: false, message: 'Error deleting shortcut' });
  }
}