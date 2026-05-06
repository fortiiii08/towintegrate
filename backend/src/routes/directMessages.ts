import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { prisma } from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { getIO } from "../lib/socket.js";

const router = Router();
router.use(authenticate);

const OWNER_EMAIL = "gustavosaforti@gmail.com";

// ── Multer ────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "../../../uploads/inbox");
const groupAvatarsDir = path.join(__dirname, "../../../uploads/group-avatars");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(groupAvatarsDir)) fs.mkdirSync(groupAvatarsDir, { recursive: true });

const makeStorage = (dir: string) => multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, unique + path.extname(file.originalname));
  },
});

const storage = makeStorage(uploadDir);
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
const uploadGroupAvatar = multer({
  storage: makeStorage(groupAvatarsDir),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_r, f, cb) => f.mimetype.startsWith("image/") ? cb(null, true) : cb(new Error("Apenas imagens")),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function fileTypeFromMime(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function formatRow(row: any, _myId: string) {
  // members may be a json_agg array (fetchConversationById) or a plain array (fetchConversations)
  const rawMembers: any[] = Array.isArray(row.members) ? row.members : [];
  const members = rawMembers.map((m: any) => ({
    id: m.id,
    name: m.name ?? m.name,
    email: m.email,
    avatarUrl: m.avatar_url ?? m.avatarUrl ?? null,
  }));
  const other = members[0] ?? { id: "", name: "Grupo", email: "", avatarUrl: null };

  const lm = row.last_message;
  return {
    id: row.id,
    isGroup: row.is_group,
    groupName: row.group_name ?? null,
    groupAvatar: row.group_avatar ?? null,
    createdBy: row.created_by ?? null,
    otherUser: {
      id: other.id,
      name: other.name,
      email: other.email,
      avatarUrl: other.avatarUrl ?? null,
    },
    members,
    lastMessage: lm
      ? {
          content: lm.content,
          fileType: lm.file_type,
          fileName: lm.file_name,
          createdAt: lm.created_at,
          senderId: lm.sender_id,
        }
      : null,
    unreadCount: Number(row.unread_count ?? 0),
    updatedAt: row.updated_at,
  };
}

// Fetch all conversations for a user — broken into simple queries to avoid timeouts
async function fetchConversations(myId: string) {
  // 1. Get base conversations
  const convs = await prisma.$queryRawUnsafe<any[]>(`
    SELECT dc.id, dc.is_group, dc.group_name, dc.group_avatar, dc.created_by, dc.updated_at
    FROM direct_conversations dc
    WHERE EXISTS (
      SELECT 1 FROM direct_conversation_participants
      WHERE conversation_id = dc.id AND user_id = $1
    )
    ORDER BY dc.updated_at DESC
  `, myId);

  if (!convs.length) return [];

  const ids = convs.map((c: any) => c.id);

  // 2. Last messages per conversation
  const lastMsgs = await prisma.$queryRawUnsafe<any[]>(`
    SELECT DISTINCT ON (conversation_id)
      conversation_id, id, content, file_type, file_name, created_at, sender_id
    FROM direct_messages
    WHERE conversation_id = ANY($1::text[])
    ORDER BY conversation_id, created_at DESC
  `, ids);

  // 3. My lastReadAt per conversation
  const readAts = await prisma.$queryRawUnsafe<any[]>(`
    SELECT conversation_id, last_read_at
    FROM direct_conversation_participants
    WHERE conversation_id = ANY($1::text[]) AND user_id = $2
  `, ids, myId);

  // 4. Unread counts
  const unreadCounts = await prisma.$queryRawUnsafe<any[]>(`
    SELECT dm.conversation_id, COUNT(*) AS cnt
    FROM direct_messages dm
    JOIN direct_conversation_participants dcp
      ON dcp.conversation_id = dm.conversation_id AND dcp.user_id = $2
    WHERE dm.conversation_id = ANY($1::text[])
      AND dm.sender_id != $2
      AND dm.created_at > COALESCE(dcp.last_read_at, '1970-01-01'::timestamptz)
    GROUP BY dm.conversation_id
  `, ids, myId);

  // 5. Members (excluding self)
  const members = await prisma.$queryRawUnsafe<any[]>(`
    SELECT dcp.conversation_id, u.id, COALESCE(p.name, u.email) AS name, u.email, p.avatar_url
    FROM direct_conversation_participants dcp
    JOIN users u ON u.id = dcp.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE dcp.conversation_id = ANY($1::text[]) AND dcp.user_id != $2
  `, ids, myId);

  // Assemble
  const lastMsgMap = Object.fromEntries(lastMsgs.map((m: any) => [m.conversation_id, m]));
  const unreadMap = Object.fromEntries(unreadCounts.map((r: any) => [r.conversation_id, Number(r.cnt)]));
  const membersMap: Record<string, any[]> = {};
  for (const m of members) {
    if (!membersMap[m.conversation_id]) membersMap[m.conversation_id] = [];
    membersMap[m.conversation_id].push(m);
  }

  return convs.map((c: any) => {
    const lm = lastMsgMap[c.id];
    return {
      ...c,
      last_message: lm ? { content: lm.content, file_type: lm.file_type, file_name: lm.file_name, created_at: lm.created_at, sender_id: lm.sender_id } : null,
      unread_count: unreadMap[c.id] ?? 0,
      members: membersMap[c.id] ?? [],
    };
  });
}

async function fetchConversationById(convId: string, myId: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, is_group, group_name, group_avatar, created_by, updated_at FROM direct_conversations WHERE id = $1`,
    convId
  );
  if (!rows.length) return null;
  const conv = rows[0];

  const lastMsgRows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id, content, file_type, file_name, created_at, sender_id FROM direct_messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
    convId
  );
  const memberRows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT u.id, COALESCE(p.name, u.email) AS name, u.email, p.avatar_url
    FROM direct_conversation_participants dcp
    JOIN users u ON u.id = dcp.user_id
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE dcp.conversation_id = $1 AND dcp.user_id != $2
  `, convId, myId);

  const lm = lastMsgRows[0];
  return formatRow({
    ...conv,
    last_message: lm ? { content: lm.content, file_type: lm.file_type, file_name: lm.file_name, created_at: lm.created_at, sender_id: lm.sender_id } : null,
    unread_count: 0,
    members: memberRows,
  }, myId);
}

async function getOrCreateDM(userAId: string, userBId: string) {
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    SELECT dc.id FROM direct_conversations dc
    WHERE dc.is_group = FALSE
      AND EXISTS (SELECT 1 FROM direct_conversation_participants WHERE conversation_id = dc.id AND user_id = $1)
      AND EXISTS (SELECT 1 FROM direct_conversation_participants WHERE conversation_id = dc.id AND user_id = $2)
    LIMIT 1
  `, userAId, userBId);

  if (rows.length > 0) return fetchConversationById(rows[0].id, userAId);

  const created = await prisma.$queryRawUnsafe<any[]>(`
    INSERT INTO direct_conversations (id, is_group, created_at, updated_at)
    VALUES (gen_random_uuid()::text, FALSE, NOW(), NOW()) RETURNING id
  `);
  const convId = created[0].id;
  await prisma.$executeRawUnsafe(`
    INSERT INTO direct_conversation_participants (id, conversation_id, user_id, created_at)
    VALUES (gen_random_uuid()::text, $1, $2, NOW()),
           (gen_random_uuid()::text, $1, $3, NOW())
  `, convId, userAId, userBId);

  return fetchConversationById(convId, userAId);
}

async function emitToParticipants(convId: string, excludeId: string, event: string, payload: any) {
  try {
    const io = getIO();
    io.to(`conv:${convId}`).emit(event, payload);
    const parts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT user_id FROM direct_conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
      convId, excludeId
    );
    for (const p of parts) {
      io.to(`user:${p.user_id}`).emit("conversation_updated", { conversationId: convId, lastMessage: payload });
    }
  } catch (_) {}
}

// ── Ensure group_avatar column exists ─────────────────────────────────────────
(async () => {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE direct_conversations ADD COLUMN IF NOT EXISTS group_avatar TEXT`
    );
  } catch (_) {}
})();

// ── PUT /api/dm/groups/:id/avatar — upload group photo (owner + admin) ─────────
router.put("/groups/:id/avatar", uploadGroupAvatar.single("avatar"), async (req: AuthRequest, res: Response) => {
  const isOwner = req.user?.email === OWNER_EMAIL;
  const isAdmin = req.user?.isAdmin || req.user?.isSecondOwner;
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "Sem permissão" });

  if (!req.file) return res.status(400).json({ error: "Sem arquivo" });

  const BASE = process.env.API_BASE_URL || "http://localhost:3001";
  const avatarUrl = `${BASE}/uploads/group-avatars/${req.file.filename}`;

  try {
    // Delete old avatar file if it exists
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT group_avatar FROM direct_conversations WHERE id = $1 AND is_group = TRUE`, req.params.id
    );
    if (existing[0]?.group_avatar) {
      const oldPath = existing[0].group_avatar.replace(BASE, "");
      fs.unlink(path.join(__dirname, "../../../", oldPath), () => {});
    }

    await prisma.$executeRawUnsafe(
      `UPDATE direct_conversations SET group_avatar = $1, updated_at = NOW() WHERE id = $2 AND is_group = TRUE`,
      avatarUrl, req.params.id
    );

    // Notify all members
    try {
      const io = getIO();
      io.to(`conv:${req.params.id}`).emit("group_avatar_updated", { conversationId: req.params.id, groupAvatar: avatarUrl });
      const parts = await prisma.$queryRawUnsafe<any[]>(
        `SELECT user_id FROM direct_conversation_participants WHERE conversation_id = $1`, req.params.id
      );
      for (const p of parts) {
        io.to(`user:${p.user_id}`).emit("conversation_updated", { conversationId: req.params.id });
      }
    } catch (_) {}

    res.json({ groupAvatar: avatarUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar foto do grupo" });
  }
});

// ── GET /api/dm/users ─────────────────────────────────────────────────────────
router.get("/users", async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.user!.id } },
      include: { profile: true },
      orderBy: { profile: { name: "asc" } },
    });
    res.json(users.map((u) => ({
      id: u.id,
      name: u.profile?.name ?? u.email,
      email: u.email,
      avatarUrl: u.profile?.avatarUrl ?? null,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar usuários" });
  }
});

// ── GET /api/dm/conversations ─────────────────────────────────────────────────
router.get("/conversations", async (req: AuthRequest, res: Response) => {
  try {
    const rows = await fetchConversations(req.user!.id);
    res.json(rows.map((r) => formatRow(r, req.user!.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao listar conversas" });
  }
});

// ── POST /api/dm/conversations — open/create DM ───────────────────────────────
router.post("/conversations", async (req: AuthRequest, res: Response) => {
  try {
    const { targetUserId } = req.body as { targetUserId: string };
    if (!targetUserId) return res.status(400).json({ error: "targetUserId obrigatório" });
    const conv = await getOrCreateDM(req.user!.id, targetUserId);
    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao abrir conversa" });
  }
});

// ── POST /api/dm/groups — create group (owner only) ───────────────────────────
router.post("/groups", async (req: AuthRequest, res: Response) => {
  if (req.user?.email !== OWNER_EMAIL)
    return res.status(403).json({ error: "Apenas o owner pode criar grupos" });

  const { groupName, memberIds } = req.body as { groupName: string; memberIds: string[] };
  if (!groupName?.trim()) return res.status(400).json({ error: "Nome do grupo obrigatório" });
  if (!memberIds?.length) return res.status(400).json({ error: "Selecione ao menos um membro" });

  try {
    const myId = req.user!.id;
    const created = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO direct_conversations (id, is_group, group_name, created_by, created_at, updated_at)
      VALUES (gen_random_uuid()::text, TRUE, $1, $2, NOW(), NOW()) RETURNING id
    `, groupName.trim(), myId);
    const convId = created[0].id;

    const allIds = Array.from(new Set([myId, ...memberIds]));
    for (const uid of allIds) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO direct_conversation_participants (id, conversation_id, user_id, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, NOW())
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `, convId, uid);
    }

    const conv = await fetchConversationById(convId, myId);

    try {
      const io = getIO();
      for (const uid of allIds) {
        io.to(`user:${uid}`).emit("conversation_updated", { conversationId: convId });
      }
    } catch (_) {}

    res.status(201).json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar grupo" });
  }
});

// ── DELETE /api/dm/groups/:id — delete group (owner only) ────────────────────
router.delete("/groups/:id", async (req: AuthRequest, res: Response) => {
  if (req.user?.email !== OWNER_EMAIL)
    return res.status(403).json({ error: "Apenas o owner pode excluir grupos" });

  try {
    const { id } = req.params;

    // Confirm it's a group
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM direct_conversations WHERE id = $1 AND is_group = TRUE`, id
    );
    if (!rows.length) return res.status(404).json({ error: "Grupo não encontrado" });

    // Get all participant ids before deleting
    const parts = await prisma.$queryRawUnsafe<any[]>(
      `SELECT user_id FROM direct_conversation_participants WHERE conversation_id = $1`, id
    );

    // Cascade deletes messages + participants automatically (FK ON DELETE CASCADE)
    await prisma.$executeRawUnsafe(`DELETE FROM direct_conversations WHERE id = $1`, id);

    // Notify all members
    try {
      const io = getIO();
      for (const p of parts) {
        io.to(`user:${p.user_id}`).emit("group_deleted", { conversationId: id });
      }
    } catch (_) {}

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir grupo" });
  }
});

// ── POST /api/dm/groups/:id/members — add members (owner only) ────────────────
router.post("/groups/:id/members", async (req: AuthRequest, res: Response) => {
  if (req.user?.email !== OWNER_EMAIL)
    return res.status(403).json({ error: "Apenas o owner pode adicionar membros" });

  const { memberIds } = req.body as { memberIds: string[] };
  if (!memberIds?.length) return res.status(400).json({ error: "Selecione ao menos um membro" });

  try {
    const { id } = req.params;

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM direct_conversations WHERE id = $1 AND is_group = TRUE`, id
    );
    if (!rows.length) return res.status(404).json({ error: "Grupo não encontrado" });

    for (const uid of memberIds) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO direct_conversation_participants (id, conversation_id, user_id, created_at)
        VALUES (gen_random_uuid()::text, $1, $2, NOW())
        ON CONFLICT (conversation_id, user_id) DO NOTHING
      `, id, uid);
    }

    await prisma.$executeRawUnsafe(`UPDATE direct_conversations SET updated_at = NOW() WHERE id = $1`, id);

    const conv = await fetchConversationById(id, req.user!.id);

    // Notify new members
    try {
      const io = getIO();
      for (const uid of memberIds) {
        io.to(`user:${uid}`).emit("conversation_updated", { conversationId: id });
      }
      io.to(`conv:${id}`).emit("members_updated", { conversationId: id });
    } catch (_) {}

    res.json(conv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao adicionar membros" });
  }
});

// ── GET /api/dm/conversations/:id/messages ────────────────────────────────────
router.get("/conversations/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;
    const { id } = req.params;

    const part = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM direct_conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      id, myId
    );
    if (!part.length) return res.status(403).json({ error: "Acesso negado" });

    const messages = await prisma.$queryRawUnsafe<any[]>(`
      SELECT dm.id, dm.conversation_id, dm.sender_id, dm.content,
             dm.file_url, dm.file_name, dm.file_type, dm.created_at,
             COALESCE(p.name, u.email) AS sender_name,
             p.avatar_url AS sender_avatar
      FROM direct_messages dm
      JOIN users u ON u.id = dm.sender_id
      LEFT JOIN profiles p ON p.user_id = u.id
      WHERE dm.conversation_id = $1
      ORDER BY dm.created_at DESC LIMIT 50
    `, id);

    res.json(messages.reverse().map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      senderAvatar: m.sender_avatar ?? null,
      content: m.content,
      fileUrl: m.file_url,
      fileName: m.file_name,
      fileType: m.file_type,
      createdAt: m.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
});

// ── POST /api/dm/conversations/:id/messages ───────────────────────────────────
router.post("/conversations/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;
    const { id } = req.params;
    const { content } = req.body as { content: string };
    if (!content?.trim()) return res.status(400).json({ error: "Mensagem vazia" });

    const part = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM direct_conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      id, myId
    );
    if (!part.length) return res.status(403).json({ error: "Acesso negado" });

    const msgs = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO direct_messages (id, conversation_id, sender_id, content, created_at)
      VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())
      RETURNING id, conversation_id, sender_id, content, file_url, file_name, file_type, created_at
    `, id, myId, content.trim());
    await prisma.$executeRawUnsafe(`UPDATE direct_conversations SET updated_at = NOW() WHERE id = $1`, id);

    const sender = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(p.name, u.email) AS name, p.avatar_url FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
      myId
    );
    const m = msgs[0];
    const payload = {
      id: m.id, conversationId: m.conversation_id, senderId: m.sender_id,
      senderName: sender[0]?.name ?? "Usuário", senderAvatar: sender[0]?.avatar_url ?? null,
      content: m.content, fileUrl: null, fileName: null, fileType: null, createdAt: m.created_at,
    };

    await emitToParticipants(id, myId, "new_message", payload);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar mensagem" });
  }
});

// ── POST /api/dm/conversations/:id/upload ────────────────────────────────────
router.post("/conversations/:id/upload", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    const part = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id FROM direct_conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      id, myId
    );
    if (!part.length) return res.status(403).json({ error: "Acesso negado" });

    const fileUrl = `/uploads/inbox/${req.file.filename}`;
    const fType = fileTypeFromMime(req.file.mimetype);
    const caption = typeof req.body?.caption === "string" && req.body.caption.trim()
      ? req.body.caption.trim()
      : null;

    const msgs = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO direct_messages (id, conversation_id, sender_id, content, file_url, file_name, file_type, created_at)
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, NOW())
      RETURNING id, conversation_id, sender_id, content, file_url, file_name, file_type, created_at
    `, id, myId, caption, fileUrl, req.file.originalname, fType);
    await prisma.$executeRawUnsafe(`UPDATE direct_conversations SET updated_at = NOW() WHERE id = $1`, id);

    const sender = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COALESCE(p.name, u.email) AS name, p.avatar_url FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
      myId
    );
    const m = msgs[0];
    const payload = {
      id: m.id, conversationId: m.conversation_id, senderId: m.sender_id,
      senderName: sender[0]?.name ?? "Usuário", senderAvatar: sender[0]?.avatar_url ?? null,
      content: m.content ?? null, fileUrl: m.file_url, fileName: m.file_name, fileType: m.file_type, createdAt: m.created_at,
    };

    await emitToParticipants(id, myId, "new_message", payload);
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao enviar arquivo" });
  }
});

// ── PUT /api/dm/conversations/:id/read ───────────────────────────────────────
router.put("/conversations/:id/read", async (req: AuthRequest, res: Response) => {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE direct_conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
      req.params.id, req.user!.id
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao marcar como lido" });
  }
});

// ── DELETE /api/dm/conversations/:id/messages/:msgId ─────────────────────────
router.delete("/conversations/:id/messages/:msgId", async (req: AuthRequest, res: Response) => {
  try {
    const myId = req.user!.id;
    const { id, msgId } = req.params;

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT sender_id, conversation_id FROM direct_messages WHERE id = $1`, msgId
    );
    if (!rows.length) return res.status(404).json({ error: "Mensagem não encontrada" });
    if (rows[0].sender_id !== myId) return res.status(403).json({ error: "Apenas o remetente pode excluir" });
    if (rows[0].conversation_id !== id) return res.status(400).json({ error: "Mensagem não pertence a esta conversa" });

    await prisma.$executeRawUnsafe(`DELETE FROM direct_messages WHERE id = $1`, msgId);

    try {
      getIO().to(`conv:${id}`).emit("message_deleted", { messageId: msgId, conversationId: id });
    } catch (_) {}

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao excluir mensagem" });
  }
});

export default router;
