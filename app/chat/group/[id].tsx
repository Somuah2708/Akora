import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, Image } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import dayjs from "dayjs";
import { uploadMedia, pickMedia } from "../../../lib/media";

type Profile = { id: string; full_name?: string | null; avatar_url?: string | null };
type Group = { id: string; name: string; avatar_url?: string | null };
type GroupMember = { user_id: string; role: string; profiles?: Profile };
type GroupMessage = {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  message_type: string;
  created_at: string;
  read_by: string[];
};

export default function GroupChatScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [input, setInput] = useState("");
  const listRef = useRef<FlatList<GroupMessage>>(null);
  const [typingMembers, setTypingMembers] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  const meId = user?.id as string | undefined;

  const loadInitial = useCallback(async () => {
    if (!groupId) return;
    // Group info + members
    const { data: groupInfo } = await supabase
      .from("groups")
      .select("id, name, avatar_url")
      .eq("id", groupId)
      .single();
    setGroup(groupInfo as Group);

    const { data: memberRows } = await supabase
      .from("group_members")
      .select("user_id, role, profiles(id, full_name, avatar_url)")
      .eq("group_id", groupId);
    setMembers((memberRows as any) || []);

    // Recent messages
    const { data: msgs } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((msgs as GroupMessage[]) || []);

    // Mark read for me
    if (meId) {
      await supabase.rpc("mark_group_messages_read", { p_group_id: groupId, p_user_id: meId });
    }
  }, [groupId, meId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!groupId) return;
    // Realtime messages
    const channel = supabase
      .channel(`group:${groupId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as GroupMessage;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          // Auto-scroll
          requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const msg = payload.new as GroupMessage;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId]);

  useEffect(() => {
    if (!groupId || !meId) return;
    // Presence channel for typing indicator
    const presence = supabase.channel(`presence:group:${groupId}`, { config: { presence: { key: meId } } });
    presence.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        presence.track({ typing: false, at: Date.now() });
      }
    });
    presence.on("presence", { event: "sync" }, () => {
      const state = presence.presenceState();
      const typing: Record<string, boolean> = {};
      Object.entries(state).forEach(([uid, metas]: any) => {
        const latest = metas[metas.length - 1];
        typing[uid] = !!latest?.typing;
      });
      setTypingMembers(typing);
    });
    return () => {
      supabase.removeChannel(presence);
    };
  }, [groupId, meId]);

  const onChangeText = useCallback(
    (t: string) => {
      setInput(t);
      // best-effort typing flag
      const channel = supabase.getChannels().find((c) => c.topic === `realtime:presence:presence:group:${groupId}`);
      // not all clients expose topic names; attempt to track through a new channel if missing
      const me = meId;
      if (me) {
        const ch = supabase.channel(`presence:group:${groupId}`, { config: { presence: { key: me } } });
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            ch.track({ typing: t.length > 0, at: Date.now() });
          }
        });
        // immediately un-sub to avoid leaks; we already have a presence sub
        setTimeout(() => supabase.removeChannel(ch), 500);
      }
    },
    [groupId, meId]
  );

  const sendText = useCallback(async () => {
    if (!meId || !groupId) return;
    const content = input.trim();
    if (!content) return;
    setSending(true);
    const { data, error } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, sender_id: meId, content, message_type: "text" })
      .select()
      .single();
    setSending(false);
    if (!error) {
      setMessages((prev) => [...prev, data as GroupMessage]);
      setInput("");
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [groupId, meId, input]);

  const sendMedia = useCallback(async () => {
    if (!meId || !groupId) return;
    const picked = await pickMedia();
    if (!picked) return;
    const { uri, type: pickedType, fileName, mimeType } = picked as any;
    const msgType: 'image' | 'video' = pickedType === 'video' ? 'video' : 'image';
    const publicUrl = await uploadMedia(uri, meId, msgType, fileName, mimeType);
    if (!publicUrl) return;
    const { data } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, sender_id: meId, media_url: publicUrl, message_type: msgType })
      .select()
      .single();
    if (data) {
      setMessages((prev) => [...prev, data as GroupMessage]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [groupId, meId]);

  useEffect(() => {
    // On focus, mark messages read
    if (!groupId || !meId) return;
    const mark = async () => {
      await supabase.rpc("mark_group_messages_read", { p_group_id: groupId, p_user_id: meId });
    };
    mark();
  }, [groupId, meId]);

  const renderItem = useCallback(
    ({ item }: { item: GroupMessage }) => {
      const mine = item.sender_id === meId;
      const sender = members.find((m) => m.user_id === item.sender_id)?.profiles;
      return (
        <View style={{ paddingHorizontal: 12, marginVertical: 6, alignItems: mine ? "flex-end" : "flex-start" }}>
          {!mine && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
              {sender?.avatar_url ? (
                <Image source={{ uri: sender.avatar_url }} style={{ width: 18, height: 18, borderRadius: 9, marginRight: 6 }} />
              ) : null}
              <Text style={{ fontSize: 12, color: "#666" }}>{sender?.full_name || "Member"}</Text>
            </View>
          )}
          <View
            style={{
              backgroundColor: mine ? "#DCF8C6" : "#fff",
              borderRadius: 12,
              padding: 10,
              maxWidth: "85%",
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowOffset: { width: 0, height: 1 },
              shadowRadius: 2,
              borderWidth: 0.5,
              borderColor: "#eee",
            }}
          >
            {item.content ? <Text style={{ fontSize: 16 }}>{item.content}</Text> : null}
            {item.media_url ? (
              item.message_type === "image" ? (
                <Image source={{ uri: item.media_url }} style={{ width: 220, height: 220, borderRadius: 8 }} />
              ) : (
                <Text style={{ fontSize: 12, color: "#666" }}>Media: {item.message_type}</Text>
              )
            ) : null}
            <Text style={{ fontSize: 10, color: "#888", marginTop: 6 }}>
              {dayjs(item.created_at).format("h:mm A")} • Seen by {item.read_by?.length || 0}
            </Text>
          </View>
        </View>
      );
    },
    [meId, members]
  );

  const typingText = useMemo(() => {
    const names = members
      .filter((m) => m.user_id !== meId && typingMembers[m.user_id])
      .map((m) => m.profiles?.full_name || "Someone");
    if (!names.length) return "";
    if (names.length === 1) return `${names[0]} is typing…`;
    return `${names.slice(0, 2).join(", ")}${names.length > 2 ? " and others" : ""} are typing…`;
  }, [typingMembers, members, meId]);

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: 12, paddingBottom: 10, backgroundColor: "#fff", borderBottomWidth: 0.5, borderBottomColor: "#eee", flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Text style={{ fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        {group?.avatar_url ? <Image source={{ uri: group.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 8 }} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "600", fontSize: 16 }}>{group?.name || "Group"}</Text>
          {!!typingText && <Text style={{ fontSize: 12, color: "#4CAF50" }}>{typingText}</Text>}
        </View>
        <TouchableOpacity onPress={() => router.push(`/chat/group-info/${groupId}` as any)} style={{ padding: 8 }}>
          <Text style={{ color: "#007AFF" }}>Info</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Composer */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#fff", borderTopWidth: 0.5, borderTopColor: "#eee" }}>
        <TouchableOpacity onPress={sendMedia} style={{ padding: 8 }}>
          <Text style={{ fontSize: 18 }}>＋</Text>
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={onChangeText}
          placeholder="Message"
          style={{ flex: 1, backgroundColor: "#f0f0f0", borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 8 }}
        />
        <TouchableOpacity onPress={sendText} disabled={sending || !input.trim()} style={{ padding: 8, opacity: sending || !input.trim() ? 0.5 : 1 }}>
          <Text style={{ fontSize: 16, color: "#007AFF" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
