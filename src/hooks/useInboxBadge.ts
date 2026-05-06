import { useEffect, useState, useCallback } from "react";
import { io as socketIO } from "socket.io-client";
import { getAuthToken } from "@/lib/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const SOCKET_URL = API.replace("/api", "");

async function apiFetch<T>(endpoint: string): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function useInboxBadge() {
  const [dmUnread, setDmUnread] = useState(0);

  const fetchDmUnread = useCallback(async () => {
    try {
      const convs = await apiFetch<Array<{ unreadCount: number }>>("/dm/conversations");
      const total = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setDmUnread(total);
    } catch {}
  }, []);

  useEffect(() => {
    fetchDmUnread();

    const token = getAuthToken();
    if (!token) return;

    const socket = socketIO(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("new_message", () => fetchDmUnread());
    socket.on("conversation_updated", () => fetchDmUnread());
    socket.on("message_deleted", () => fetchDmUnread());

    return () => {
      socket.disconnect();
    };
  }, [fetchDmUnread]);

  return dmUnread;
}
