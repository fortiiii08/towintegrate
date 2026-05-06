import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { io as socketIO, Socket } from "socket.io-client";
import { ArrowLeft, Search, Send, Paperclip, X, Download, FileText, Smile, Trash2, Users, Check, UserPlus, Trash, Receipt, Loader2, Upload, Mic } from "lucide-react";
import { downloadFile } from "@/lib/downloadFile";
import { useAuthContext } from "@/contexts/AuthContext";
import { getAuthToken } from "@/lib/api";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const SOCKET_URL = API.replace("/api", "");
const OWNER_EMAIL = "gustavosaforti@gmail.com";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DMUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface LastMessage {
  content: string | null;
  fileType: string | null;
  fileName: string | null;
  createdAt: string;
  senderId: string;
}

interface Conversation {
  id: string;
  isGroup: boolean;
  groupName: string | null;
  groupAvatar: string | null;
  createdBy: string | null;
  otherUser: DMUser;
  members: DMUser[];
  lastMessage: LastMessage | null;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}
function formatTime(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd/MM/yy", { locale: ptBR });
}
function formatFullTime(iso: string) {
  return format(new Date(iso), "HH:mm", { locale: ptBR });
}
function formatDateSeparator(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}
function lastMsgPreview(msg: LastMessage | null, myId: string): string {
  if (!msg) return "Nenhuma mensagem";
  const prefix = msg.senderId === myId ? "Você: " : "";
  if (msg.fileType === "image") return `${prefix}📷 Imagem`;
  if (msg.fileType === "video") return `${prefix}🎥 Vídeo`;
  if (msg.fileType === "audio") return `${prefix}🎵 Áudio`;
  if (msg.fileType === "file") return `${prefix}📎 ${msg.fileName ?? "Arquivo"}`;
  return prefix + (msg.content ?? "");
}
function convDisplayName(conv: Conversation) {
  return conv.isGroup ? (conv.groupName ?? "Grupo") : conv.otherUser.name;
}
function groupByDate(messages: Message[]): Array<{ date: string; msgs: Message[] }> {
  const groups: Array<{ date: string; msgs: Message[] }> = [];
  for (const m of messages) {
    const day = format(new Date(m.createdAt), "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last && last.date === day) last.msgs.push(m);
    else groups.push({ date: day, msgs: [m] });
  }
  return groups;
}
function formatRecordingTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
async function apiFetch<T>(endpoint: string, opts: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API}${endpoint}`, {
    ...opts,
    headers: { ...(opts.headers as object), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }: { user: { name: string; avatarUrl?: string | null }; size?: number }) {
  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt={user.name} style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />;
  }
  const fontSize = size < 36 ? "text-xs" : "text-sm";
  return (
    <div style={{ width: size, height: size }} className={`rounded-full bg-[#407b75] flex items-center justify-center flex-shrink-0 font-semibold text-white ${fontSize}`}>
      {initials(user.name)}
    </div>
  );
}

function GroupAvatar({ size = 40, avatarUrl }: { size?: number; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="grupo" style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div style={{ width: size, height: size }} className="rounded-full bg-[#9b3515] flex items-center justify-center flex-shrink-0">
      <Users size={size * 0.45} className="text-white" />
    </div>
  );
}

// ── Create Group Dialog ───────────────────────────────────────────────────────
function CreateGroupDialog({ allUsers, onClose, onCreated }: {
  allUsers: DMUser[];
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const filtered = allUsers.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function submit() {
    if (!groupName.trim() || selected.size === 0) return;
    setLoading(true);
    try {
      const conv = await apiFetch<Conversation>("/dm/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: groupName.trim(), memberIds: Array.from(selected) }),
      });
      onCreated(conv);
      onClose();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#202c33] rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3942]">
          <h2 className="font-semibold text-white text-lg">Criar Grupo</h2>
          <button onClick={onClose} className="text-[#aebac1] hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Group name */}
          <div>
            <label className="text-xs text-[#8696a0] uppercase tracking-wide mb-1 block">Nome do grupo</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ex: Equipe Marketing"
              className="w-full bg-[#2a3942] text-white rounded-lg px-4 py-2.5 text-sm outline-none placeholder:text-[#8696a0] focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          {/* Member search */}
          <div>
            <label className="text-xs text-[#8696a0] uppercase tracking-wide mb-1 block">
              Membros ({selected.size} selecionados)
            </label>
            <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2 mb-2">
              <Search size={14} className="text-[#8696a0]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="bg-transparent flex-1 text-sm text-white placeholder:text-[#8696a0] outline-none" />
            </div>
            <div className="max-h-52 overflow-y-auto space-y-1">
              {filtered.map((u) => (
                <button key={u.id} onClick={() => toggle(u.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${selected.has(u.id) ? "bg-[#00a884]/20" : "hover:bg-[#2a3942]"}`}>
                  <Avatar user={u} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.name}</p>
                    <p className="text-xs text-[#8696a0] truncate">{u.email}</p>
                  </div>
                  {selected.has(u.id) && <Check size={16} className="text-[#00a884] flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[#2a3942] flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#8696a0] hover:text-white transition-colors">Cancelar</button>
          <button
            onClick={submit}
            disabled={!groupName.trim() || selected.size === 0 || loading}
            className="px-5 py-2 bg-[#00a884] hover:bg-[#017561] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Criando..." : "Criar Grupo"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Members Dialog ────────────────────────────────────────────────────────
function AddMembersDialog({ conv, allUsers, onClose, onUpdated }: {
  conv: Conversation;
  allUsers: DMUser[];
  onClose: () => void;
  onUpdated: (conv: Conversation) => void;
}) {
  const currentIds = new Set([...conv.members.map((m) => m.id)]);
  const available = allUsers.filter((u) => !currentIds.has(u.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const filtered = available.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  async function submit() {
    if (!selected.size) return;
    setLoading(true);
    try {
      const updated = await apiFetch<Conversation>(`/dm/groups/${conv.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: Array.from(selected) }),
      });
      onUpdated(updated);
      onClose();
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#202c33] rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3942]">
          <h2 className="font-semibold text-white text-lg">Adicionar Membros</h2>
          <button onClick={onClose} className="text-[#aebac1] hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-[#8696a0]">Membros atuais: {conv.members.map((m) => m.name.split(" ")[0]).join(", ")}</p>
          <div className="flex items-center gap-2 bg-[#2a3942] rounded-lg px-3 py-2">
            <Search size={14} className="text-[#8696a0]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuário..." className="bg-transparent flex-1 text-sm text-white placeholder:text-[#8696a0] outline-none" />
          </div>
          <div className="max-h-52 overflow-y-auto space-y-1">
            {filtered.length === 0 && <p className="text-sm text-[#8696a0] text-center py-4">Todos os usuários já estão no grupo</p>}
            {filtered.map((u) => (
              <button key={u.id} onClick={() => toggle(u.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${selected.has(u.id) ? "bg-[#00a884]/20" : "hover:bg-[#2a3942]"}`}>
                <Avatar user={u} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.name}</p>
                  <p className="text-xs text-[#8696a0] truncate">{u.email}</p>
                </div>
                {selected.has(u.id) && <Check size={16} className="text-[#00a884] flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[#2a3942] flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#8696a0] hover:text-white transition-colors">Cancelar</button>
          <button onClick={submit} disabled={!selected.size || loading} className="px-5 py-2 bg-[#00a884] hover:bg-[#017561] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? "Adicionando..." : `Adicionar (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InboxPage() {
  const navigate = useNavigate();
  const { user: authUser, profile, isAdmin } = useAuthContext();
  const isOwner = useMemo(
    () => authUser?.email === OWNER_EMAIL || profile?.email === OWNER_EMAIL,
    [authUser, profile]
  );
  const canManageGroups = isOwner || isAdmin;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<DMUser[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingCaption, setPendingCaption] = useState("");
  const [sendingFile, setSendingFile] = useState(false);
  const [nfTag, setNfTag] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const [downloadingMsgId, setDownloadingMsgId] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingGroupAvatar, setUploadingGroupAvatar] = useState(false);
  const myId = authUser?.id ?? "";
  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  // ── Socket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const socket = socketIO(SOCKET_URL, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("new_message", (msg: Message) => {
      if (msg.conversationId === activeConvId) setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: { content: msg.content, fileType: msg.fileType, fileName: msg.fileName, createdAt: msg.createdAt, senderId: msg.senderId }, unreadCount: c.id === activeConvId ? 0 : c.unreadCount + 1, updatedAt: msg.createdAt }
            : c
        ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      );
    });

    socket.on("conversation_updated", () => loadConversations());
    socket.on("message_deleted", ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    socket.on("group_deleted", ({ conversationId }: { conversationId: string }) => {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setActiveConvId((prev) => prev === conversationId ? null : prev);
    });

    socket.on("members_updated", ({ conversationId }: { conversationId: string }) => {
      // Refresh the updated conversation
      fetchConversationApi(conversationId);
    });

    return () => { socket.disconnect(); };
  }, [activeConvId]);

  useEffect(() => {
    if (!socketRef.current || !activeConvId) return;
    socketRef.current.emit("join_conversation", activeConvId);
    return () => { socketRef.current?.emit("leave_conversation", activeConvId); };
  }, [activeConvId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const data = await apiFetch<Conversation[]>("/dm/conversations");
      setConversations(data);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadConversations();
    apiFetch<DMUser[]>("/dm/users").then(setAllUsers).catch(console.error);
  }, [loadConversations]);

  // ── Actions ───────────────────────────────────────────────────────────────
  async function fetchConversationApi(convId: string) {
    try {
      await loadConversations();
    } catch (e) { console.error(e); }
  }

  async function deleteGroup(convId: string) {
    try {
      await apiFetch(`/dm/groups/${convId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      setActiveConvId(null);
      setConfirmDeleteGroup(false);
    } catch (e: any) { alert(e.message); }
  }

  async function uploadGroupAvatarFn(convId: string, file: File) {
    setUploadingGroupAvatar(true);
    try {
      const token = getAuthToken();
      const form = new FormData();
      form.append("avatar", file);
      const res = await fetch(`${API}/dm/groups/${convId}/avatar`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) throw new Error();
      const { groupAvatar } = await res.json();
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, groupAvatar } : c));
    } catch {
      alert("Erro ao enviar foto do grupo");
    } finally {
      setUploadingGroupAvatar(false);
    }
  }

  async function openConversation(convId: string) {
    clearPendingFile();
    setActiveConvId(convId);
    setLoadingMsgs(true);
    try {
      const data = await apiFetch<Message[]>(`/dm/conversations/${convId}/messages`);
      setMessages(data);
      await apiFetch(`/dm/conversations/${convId}/read`, { method: "PUT" });
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c)));
    } catch (e) { console.error(e); }
    finally { setLoadingMsgs(false); }
  }

  async function startConversation(targetUserId: string) {
    try {
      const conv = await apiFetch<Conversation>("/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      setConversations((prev) => prev.find((c) => c.id === conv.id) ? prev : [conv, ...prev]);
      setShowNewChat(false);
      openConversation(conv.id);
    } catch (e) { console.error(e); }
  }

  async function sendText() {
    if (!text.trim() || !activeConvId) return;
    const content = text.trim();
    setText("");
    try {
      await apiFetch(`/dm/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    } catch (e) { console.error(e); setText(content); }
  }

  async function deleteMessage(convId: string, msgId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    try {
      await apiFetch(`/dm/conversations/${convId}/messages/${msgId}`, { method: "DELETE" });
    } catch (e) {
      console.error(e);
      const data = await apiFetch<Message[]>(`/dm/conversations/${convId}/messages`);
      setMessages(data);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    e.target.value = "";
    // Generate preview URL for images; use null for other types
    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    setPendingFile(file);
    setPendingPreview(preview);
    setPendingCaption("");
    setTimeout(() => captionRef.current?.focus(), 50);
  }

  function clearPendingFile() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setPendingCaption("");
    setNfTag(false);
  }

  async function sendPendingFile() {
    if (!pendingFile || !activeConvId || sendingFile) return;
    setSendingFile(true);
    const token = getAuthToken();
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      // Send to conversation
      const form = new FormData();
      form.append("file", pendingFile);
      if (pendingCaption.trim()) form.append("caption", pendingCaption.trim());
      await fetch(`${API}/dm/conversations/${activeConvId}/upload`, {
        method: "POST",
        headers: authHeaders,
        body: form,
      });

      // If NF tag is active, also upload to financeiro NF
      if (nfTag) {
        const nfForm = new FormData();
        nfForm.append("file", pendingFile);
        await fetch(`${API}/financeiro/nf`, {
          method: "POST",
          headers: authHeaders,
          body: nfForm,
        });
      }

      clearPendingFile();
    } catch (err) {
      console.error(err);
    } finally {
      setSendingFile(false);
    }
  }

  // ── Audio recording ───────────────────────────────────────────────────────
  async function startRecording() {
    if (!activeConvId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      alert("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  }

  function cancelRecording() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const recorder = mediaRecorderRef.current;
    if (recorder) {
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
    recordingStreamRef.current = null;
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
  }

  async function stopAndSendRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || !activeConvId) { cancelRecording(); return; }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    recorder.onstop = async () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "mp4" : "webm";
      const blob = new Blob(audioChunksRef.current, { type: mimeType });
      audioChunksRef.current = [];
      const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: mimeType });
      const token = getAuthToken();
      const form = new FormData();
      form.append("file", file);
      try {
        await fetch(`${API}/dm/conversations/${activeConvId}/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
      } catch (e) { console.error(e); }
      recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
      recordingStreamRef.current = null;
      mediaRecorderRef.current = null;
    };
    recorder.stop();
  }

  // ── Filtered ──────────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter((c) => {
    const name = convDisplayName(c).toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || (!c.isGroup && c.otherUser.email.toLowerCase().includes(q));
  });

  const filteredUsers = allUsers.filter(
    (u) =>
      (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
      !conversations.find((c) => !c.isGroup && c.otherUser.id === u.id)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#111b21] text-white overflow-hidden">

      {/* ── Left panel ───────────────────────────────────────────────────── */}
      <div className="w-[360px] min-w-[320px] flex flex-col border-r border-[#2a3942] bg-[#111b21]">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33]">
          <button onClick={() => navigate("/")} className="text-[#aebac1] hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <Avatar user={{ name: profile?.name ?? "Eu", avatarUrl: profile?.avatar_url }} size={40} />
          <span className="font-semibold text-white flex-1">Mensagens</span>
          <div className="flex gap-1">
            {canManageGroups && (
              <button
                onClick={() => { setShowCreateGroup(true); setShowNewChat(false); }}
                className="text-[#aebac1] hover:text-[#00a884] transition-colors text-xs border border-[#aebac1] hover:border-[#00a884] rounded px-2 py-1 flex items-center gap-1"
                title="Criar grupo"
              >
                <Users size={12} /> Grupo
              </button>
            )}
            <button
              onClick={() => { setShowNewChat((v) => !v); setSearch(""); }}
              className="text-[#aebac1] hover:text-[#00a884] transition-colors text-xs border border-[#aebac1] hover:border-[#00a884] rounded px-2 py-1"
            >
              + Nova
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 bg-[#111b21]">
          <div className="flex items-center gap-2 bg-[#202c33] rounded-lg px-3 py-2">
            <Search size={16} className="text-[#aebac1]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={showNewChat ? "Buscar usuário..." : "Buscar conversa..."}
              className="bg-transparent flex-1 text-sm text-white placeholder:text-[#8696a0] outline-none"
            />
            {search && <button onClick={() => setSearch("")}><X size={14} className="text-[#aebac1]" /></button>}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {showNewChat ? (
            <>
              <p className="px-4 py-2 text-xs text-[#8696a0] uppercase tracking-wide">Iniciar conversa com</p>
              {filteredUsers.length === 0 && <p className="px-4 py-4 text-sm text-[#8696a0]">Nenhum usuário encontrado</p>}
              {filteredUsers.map((u) => (
                <button key={u.id} onClick={() => startConversation(u.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] transition-colors text-left">
                  <Avatar user={u} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{u.name}</p>
                    <p className="text-xs text-[#8696a0] truncate">{u.email}</p>
                  </div>
                </button>
              ))}
            </>
          ) : (
            <>
              {filteredConvs.length === 0 && (
                <div className="px-4 py-8 text-center text-[#8696a0] text-sm">
                  <p>Nenhuma conversa ainda.</p>
                  <button onClick={() => setShowNewChat(true)} className="mt-2 text-[#00a884] hover:underline">Iniciar uma conversa</button>
                </div>
              )}
              {filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-b border-[#202c33] ${activeConvId === conv.id ? "bg-[#2a3942]" : "hover:bg-[#202c33]"}`}
                >
                  {conv.isGroup ? <GroupAvatar size={48} avatarUrl={conv.groupAvatar} /> : <Avatar user={conv.otherUser} size={48} />}
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-baseline">
                      <p className="font-medium text-white truncate">{convDisplayName(conv)}</p>
                      {conv.lastMessage && (
                        <span className={`text-xs ml-2 flex-shrink-0 ${conv.unreadCount > 0 ? "text-[#00a884]" : "text-[#8696a0]"}`}>
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-[#8696a0] truncate flex-1">{lastMsgPreview(conv.lastMessage, myId)}</p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 bg-[#00a884] text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#222e35] gap-4">
            <div className="w-24 h-24 rounded-full bg-[#2a3942] flex items-center justify-center">
              <Smile size={48} className="text-[#aebac1]" />
            </div>
            <p className="text-[#aebac1] text-xl font-light">TownIntegrate Mensagens</p>
            <p className="text-[#8696a0] text-sm text-center max-w-xs">Selecione uma conversa ou inicie uma nova para começar a conversar com sua equipe.</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] border-b border-[#2a3942] flex-shrink-0">
              {/* Hidden input for group avatar upload */}
              <input
                ref={groupAvatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && activeConv.isGroup) uploadGroupAvatarFn(activeConv.id, file);
                  e.target.value = "";
                }}
              />
              {activeConv.isGroup ? (
                <button
                  type="button"
                  onClick={() => canManageGroups && !uploadingGroupAvatar && groupAvatarInputRef.current?.click()}
                  title={canManageGroups ? "Clique para alterar a foto do grupo" : undefined}
                  className={`relative flex-shrink-0 rounded-full ${canManageGroups ? "cursor-pointer group/gavatar" : "cursor-default"}`}
                >
                  <GroupAvatar size={40} avatarUrl={activeConv.groupAvatar} />
                  {canManageGroups && (
                    <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover/gavatar:opacity-100 transition-opacity flex items-center justify-center">
                      {uploadingGroupAvatar
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Upload size={14} className="text-white" />}
                    </span>
                  )}
                </button>
              ) : <Avatar user={activeConv.otherUser} size={40} />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{convDisplayName(activeConv)}</p>
                <p className="text-xs text-[#8696a0] truncate">
                  {activeConv.isGroup
                    ? `${activeConv.members.length + 1} membros · ${activeConv.members.map((m) => m.name.split(" ")[0]).join(", ")}`
                    : activeConv.otherUser.email}
                </p>
              </div>
              {/* Group actions — owner + admin */}
              {canManageGroups && activeConv.isGroup && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setShowAddMembers(true)}
                    className="text-[#aebac1] hover:text-[#00a884] transition-colors p-2 rounded-full hover:bg-[#2a3942]"
                    title="Adicionar membros"
                  >
                    <UserPlus size={18} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteGroup(true)}
                    className="text-[#aebac1] hover:text-red-400 transition-colors p-2 rounded-full hover:bg-[#2a3942]"
                    title="Excluir grupo"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1" style={{ backgroundColor: "#0b141a" }}>
              {loadingMsgs ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex justify-center">
                  <span className="bg-[#202c33] text-[#8696a0] text-xs px-3 py-1 rounded-full">Sem mensagens ainda. Diga olá!</span>
                </div>
              ) : (
                groupByDate(messages).map(({ date, msgs }) => (
                  <div key={date}>
                    <div className="flex justify-center my-3">
                      <span className="bg-[#202c33] text-[#8696a0] text-xs px-3 py-1 rounded-full">
                        {formatDateSeparator(msgs[0].createdAt)}
                      </span>
                    </div>
                    {msgs.map((msg, idx) => {
                      const isMine = msg.senderId === myId;
                      const showAvatar = !isMine && (idx === msgs.length - 1 || msgs[idx + 1]?.senderId !== msg.senderId);
                      return (
                        <div key={msg.id} className={`flex items-end gap-2 mb-1 group/msg ${isMine ? "justify-end" : "justify-start"}`}>
                          {!isMine && (
                            <div className="w-7 flex-shrink-0">
                              {showAvatar && <Avatar user={{ name: msg.senderName, avatarUrl: msg.senderAvatar }} size={28} />}
                            </div>
                          )}
                          {isMine && (
                            <button onClick={() => deleteMessage(msg.conversationId, msg.id)} className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-[#8696a0] hover:text-red-400 mb-1 flex-shrink-0" title="Excluir">
                              <Trash2 size={14} />
                            </button>
                          )}
                          <div className={`max-w-[65%] rounded-lg px-3 py-2 shadow ${isMine ? "bg-[#005c4b] rounded-br-none" : "bg-[#202c33] rounded-bl-none"}`}>
                            {!isMine && (activeConv.isGroup || showAvatar) && (
                              <p className="text-xs text-[#00a884] font-medium mb-1">{msg.senderName}</p>
                            )}
                            {msg.fileType === "image" && msg.fileUrl && (
                              <img src={`${SOCKET_URL}${msg.fileUrl}`} alt={msg.fileName ?? "imagem"} className="rounded max-w-full max-h-64 cursor-pointer object-cover" onClick={() => setLightboxUrl(`${SOCKET_URL}${msg.fileUrl}`)} />
                            )}
                            {msg.fileType === "video" && msg.fileUrl && (
                              <video src={`${SOCKET_URL}${msg.fileUrl}`} controls className="rounded max-w-full max-h-48" />
                            )}
                            {msg.fileType === "file" && msg.fileUrl && (
                              <button
                                onClick={async () => {
                                  setDownloadingMsgId(msg.id);
                                  try { await downloadFile(`${SOCKET_URL}${msg.fileUrl!}`, msg.fileName ?? "arquivo"); }
                                  catch { /* silent */ }
                                  finally { setDownloadingMsgId(null); }
                                }}
                                className="flex items-center gap-2 bg-[#2a3942] rounded p-2 hover:bg-[#364a54] transition-colors w-full text-left"
                              >
                                <FileText size={20} className="text-[#aebac1] flex-shrink-0" />
                                <span className="text-sm text-white truncate max-w-[180px]">{msg.fileName}</span>
                                {downloadingMsgId === msg.id
                                  ? <Loader2 size={14} className="text-[#aebac1] flex-shrink-0 ml-auto animate-spin" />
                                  : <Download size={14} className="text-[#aebac1] flex-shrink-0 ml-auto" />}
                              </button>
                            )}
                            {msg.fileType === "audio" && msg.fileUrl && (
                              <audio src={`${SOCKET_URL}${msg.fileUrl}`} controls className="max-w-full" />
                            )}
                            {msg.content && <p className="text-sm text-white whitespace-pre-wrap break-words">{msg.content}</p>}
                            <p className="text-[10px] mt-1 text-right text-[#8696a0]">{formatFullTime(msg.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File preview bar */}
            {pendingFile && (
              <div className="bg-[#1a2530] border-t border-[#2a3942] px-4 py-3 flex-shrink-0">
                <div className="flex items-start gap-3">
                  {/* Thumbnail or file icon */}
                  <div className="relative flex-shrink-0">
                    {pendingPreview ? (
                      <img src={pendingPreview} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-[#2a3942]" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#2a3942] flex flex-col items-center justify-center gap-1">
                        <FileText size={22} className="text-[#aebac1]" />
                        <span className="text-[9px] text-[#8696a0] text-center px-1 truncate w-full">{pendingFile.name.split(".").pop()?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  {/* Caption textarea */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-[#8696a0] truncate flex-1">{pendingFile.name}</p>
                      {/* NF Tag toggle */}
                      <button
                        onClick={() => setNfTag((v) => !v)}
                        title={nfTag ? "Remover tag NF" : "Marcar como Nota Fiscal (NF)"}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold transition-colors flex-shrink-0 ${
                          nfTag
                            ? "bg-amber-500 text-white"
                            : "bg-[#2a3942] text-[#8696a0] hover:bg-amber-500/20 hover:text-amber-400"
                        }`}
                      >
                        <Receipt size={11} />
                        NF
                      </button>
                    </div>
                    <textarea
                      ref={captionRef}
                      value={pendingCaption}
                      onChange={(e) => setPendingCaption(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendPendingFile(); } }}
                      placeholder="Adicionar legenda..."
                      rows={1}
                      className="w-full bg-[#2a3942] text-white placeholder:text-[#8696a0] rounded-lg px-3 py-2 text-sm outline-none resize-none leading-5 max-h-24 overflow-y-auto"
                      style={{ minHeight: "36px" }}
                      onInput={(e) => { const t = e.currentTarget; t.style.height = "36px"; t.style.height = `${Math.min(t.scrollHeight, 96)}px`; }}
                    />
                    {nfTag && (
                      <p className="mt-1 text-[10px] text-amber-400 flex items-center gap-1">
                        <Receipt size={10} /> Este arquivo será registrado como Nota Fiscal no Financeiro
                      </p>
                    )}
                  </div>
                  {/* Cancel */}
                  <button onClick={clearPendingFile} className="text-[#8696a0] hover:text-white transition-colors flex-shrink-0 mt-1" title="Cancelar">
                    <X size={18} />
                  </button>
                  {/* Send */}
                  <button
                    onClick={sendPendingFile}
                    disabled={sendingFile}
                    className="bg-[#00a884] hover:bg-[#017561] disabled:opacity-40 text-white rounded-full w-9 h-9 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5"
                  >
                    {sendingFile
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <Send size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Input */}
            {isRecording ? (
              <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33] border-t border-[#2a3942] flex-shrink-0">
                <button
                  onClick={cancelRecording}
                  className="text-[#aebac1] hover:text-red-400 transition-colors flex-shrink-0"
                  title="Cancelar gravação"
                >
                  <X size={22} />
                </button>
                <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2.5 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                  <span className="text-red-400 text-sm font-mono tabular-nums flex-shrink-0">
                    {formatRecordingTime(recordingSeconds)}
                  </span>
                  <div className="flex-1 flex items-end gap-[3px] h-5">
                    {[3, 5, 8, 5, 7, 4, 9, 6, 4, 7, 5, 8, 3, 6, 4].map((h, i) => (
                      <span
                        key={i}
                        className="w-[3px] rounded-full bg-[#00a884]/60 animate-pulse"
                        style={{ height: `${h * 2}px`, animationDelay: `${i * 80}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-[#8696a0] text-xs flex-shrink-0">Gravando...</span>
                </div>
                <button
                  onClick={stopAndSendRecording}
                  className="bg-[#00a884] hover:bg-[#017561] text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors flex-shrink-0"
                  title="Enviar áudio"
                >
                  <Send size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-end gap-3 px-4 py-3 bg-[#202c33] border-t border-[#2a3942] flex-shrink-0">
                <button onClick={() => fileInputRef.current?.click()} className="text-[#aebac1] hover:text-[#00a884] transition-colors flex-shrink-0 mb-1" title="Anexar">
                  <Paperclip size={22} />
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" onChange={handleFileChange} />
                <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
                    placeholder="Mensagem"
                    rows={1}
                    className="w-full bg-transparent text-white placeholder:text-[#8696a0] outline-none resize-none text-sm leading-5 max-h-32 overflow-y-auto"
                    style={{ minHeight: "24px" }}
                    onInput={(e) => { const t = e.currentTarget; t.style.height = "24px"; t.style.height = `${Math.min(t.scrollHeight, 128)}px`; }}
                  />
                </div>
                {text.trim() ? (
                  <button onClick={sendText} className="bg-[#00a884] hover:bg-[#017561] text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors flex-shrink-0">
                    <Send size={18} />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="bg-[#2a3942] hover:bg-[#00a884] text-[#aebac1] hover:text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors flex-shrink-0"
                    title="Gravar áudio"
                  >
                    <Mic size={20} />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Lightbox ────────────────────────────────────────────────────────── */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white bg-[#2a3942] rounded-full p-2 hover:bg-[#364a54]" onClick={() => setLightboxUrl(null)}><X size={20} /></button>
          <button
            onClick={(e) => { e.stopPropagation(); downloadFile(lightboxUrl, lightboxUrl.split("/").pop() ?? "imagem"); }}
            className="absolute top-4 right-16 text-white bg-[#2a3942] rounded-full p-2 hover:bg-[#364a54]"
          ><Download size={20} /></button>
          <img src={lightboxUrl} alt="preview" className="max-w-full max-h-full object-contain rounded" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* ── Create Group Dialog ──────────────────────────────────────────────── */}
      {showCreateGroup && (
        <CreateGroupDialog
          allUsers={allUsers}
          onClose={() => setShowCreateGroup(false)}
          onCreated={(conv) => {
            setConversations((prev) => [conv, ...prev]);
            openConversation(conv.id);
          }}
        />
      )}

      {/* ── Add Members Dialog ───────────────────────────────────────────────── */}
      {showAddMembers && activeConv?.isGroup && (
        <AddMembersDialog
          conv={activeConv}
          allUsers={allUsers}
          onClose={() => setShowAddMembers(false)}
          onUpdated={(updated) => {
            setConversations((prev) => prev.map((c) => c.id === updated.id ? updated : c));
          }}
        />
      )}

      {/* ── Confirm Delete Group ─────────────────────────────────────────────── */}
      {confirmDeleteGroup && activeConv?.isGroup && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteGroup(false)}>
          <div className="bg-[#202c33] rounded-xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash size={18} className="text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Excluir grupo</p>
                <p className="text-xs text-[#8696a0]">{convDisplayName(activeConv)}</p>
              </div>
            </div>
            <p className="text-sm text-[#8696a0] mb-6">
              Todas as mensagens e o histórico do grupo serão apagados permanentemente. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDeleteGroup(false)} className="px-4 py-2 text-sm text-[#8696a0] hover:text-white transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => deleteGroup(activeConv.id)}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Excluir grupo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
