import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Image, FlatList, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { debouncedRouter } from '@/utils/navigationDebounce';
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import { uploadMedia, pickMedia } from "../../../lib/media";

type Profile = { id: string; full_name?: string | null; avatar_url?: string | null };
type MemberRow = { user_id: string; role: string; profiles?: Profile };

export default function GroupInfoScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const meId = user?.id as string | undefined;

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  const load = useCallback(async () => {
    if (!groupId || !meId) return;
    const { data: g } = await supabase.from("groups").select("id, name, avatar_url").eq("id", groupId).single();
    if (g) {
      setName((g as any).name || "");
      setAvatarUrl((g as any).avatar_url || undefined);
    }
    const { data: ms } = await supabase
      .from("group_members")
      .select("user_id, role, profiles(id, full_name, avatar_url)")
      .eq("group_id", groupId);
    const list = (ms as any as MemberRow[]) || [];
    setMembers(list);
    setIsAdmin(!!list.find((m) => m.user_id === meId && m.role === "admin"));
  }, [groupId, meId]);

  useEffect(() => {
    load();
  }, [load]);

  // Presence: show online members count
  useEffect(() => {
    if (!groupId || !meId) return;
    const presence = supabase.channel(`presence:group:${groupId}`, { config: { presence: { key: meId } } });
    presence.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        presence.track({ at: Date.now(), typing: false });
      }
    });
    const sync = () => {
      const state = presence.presenceState();
      const onlineIds = new Set<string>(Object.keys(state));
      const count = members.filter((m) => onlineIds.has(m.user_id)).length;
      setOnlineCount(count);
    };
    presence.on("presence", { event: "sync" }, sync);
    // initial compute shortly after subscribe
    const t = setTimeout(sync, 400);
    return () => {
      clearTimeout(t);
      supabase.removeChannel(presence);
    };
  }, [groupId, meId, members]);

  const saveName = useCallback(async () => {
    if (!isAdmin || !groupId) return;
    const n = name.trim();
    if (!n) return;
    const { error } = await supabase.from("groups").update({ name: n }).eq("id", groupId);
    if (error) Alert.alert("Error", "Failed to rename group");
  }, [isAdmin, name, groupId]);

  const changeAvatar = useCallback(async () => {
    if (!isAdmin || !meId || !groupId) return;
    const picked = await pickMedia();
    if (!picked) return;
    if ((picked as any).type === "video") {
      Alert.alert("Unsupported", "Please select an image for the group icon");
      return;
    }
    const publicUrl = await uploadMedia(picked.uri, meId, "image", picked.fileName, picked.mimeType);
    if (publicUrl) {
      const { error } = await supabase.from("groups").update({ avatar_url: publicUrl }).eq("id", groupId);
      if (!error) setAvatarUrl(publicUrl);
    }
  }, [isAdmin, meId, groupId]);

  const removeMember = useCallback(async (uid: string) => {
    if (!isAdmin || !groupId) return;
    // Prevent removing self as last admin (basic guard)
    if (uid === meId) {
      const admins = members.filter((m) => m.role === "admin");
      if (admins.length <= 1) {
        Alert.alert("Action blocked", "You are the only admin. Promote another member before leaving/removing yourself.");
        return;
      }
    }
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", uid);
    if (!error) setMembers((prev) => prev.filter((m) => m.user_id !== uid));
  }, [isAdmin, groupId, meId, members]);

  const toggleRole = useCallback(async (uid: string) => {
    if (!isAdmin || !groupId) return;
    const m = members.find((x) => x.user_id === uid);
    if (!m) return;
    const next = m.role === "admin" ? "member" : "admin";
    const { error } = await supabase.from("group_members").update({ role: next }).eq("group_id", groupId).eq("user_id", uid);
    if (!error) setMembers((prev) => prev.map((x) => (x.user_id === uid ? { ...x, role: next } : x)));
  }, [isAdmin, groupId, members]);

  const findCandidates = useCallback(async (q: string) => {
    if (!groupId) return;
    const currentIds = members.map((m) => m.user_id);
    // Supabase 'not in' operator
    const notIn = `(${currentIds.map((id) => `"${id}"`).join(',')})`;
    const req = supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .not("id", "in", notIn)
      .limit(50);
    if (q.trim()) req.ilike("full_name", `%${q}%`);
    const { data } = await req;
    setCandidates((data as any as Profile[]) || []);
  }, [groupId, members]);

  useEffect(() => {
    if (adding) findCandidates("");
  }, [adding, findCandidates]);

  const addMember = useCallback(async (uid: string) => {
    if (!isAdmin || !groupId) return;
    const { error } = await supabase.from("group_members").insert({ group_id: groupId, user_id: uid });
    if (!error) {
      setMembers((prev) => [...prev, { user_id: uid, role: "member" }]);
      setCandidates((prev) => prev.filter((c) => c.id !== uid));
    }
  }, [isAdmin, groupId]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: "#eee", flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={{ padding: 8, marginRight: 8 }}>
          <Text style={{ fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Group Info</Text>
      </View>

      {/* Group header */}
      <View style={{ alignItems: "center", padding: 16 }}>
        <TouchableOpacity onPress={changeAvatar} disabled={!isAdmin}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" }}>
              <Text>Icon</Text>
            </View>
          )}
        </TouchableOpacity>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={saveName}
          editable={isAdmin}
          placeholder="Group name"
          style={{ marginTop: 12, fontSize: 18, fontWeight: "600", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: isAdmin ? "#f7f7f7" : "transparent", borderRadius: 8 }}
        />
      </View>

      {/* Members */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#64748B", fontWeight: "600" }}>Members • {members.length} {onlineCount > 0 ? `(${onlineCount} online)` : ''}</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => setAdding(true)} style={{ padding: 8 }}>
            <Text style={{ color: "#64748B", fontWeight: "600" }}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={members}
        keyExtractor={(item) => item.user_id}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#f2f2f2", marginLeft: 72 }} />}
        renderItem={({ item }) => (
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
            {item.profiles?.avatar_url ? (
              <Image source={{ uri: item.profiles.avatar_url }} style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }} />
            ) : (
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#eee", marginRight: 12 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600" }}>{item.profiles?.full_name || item.user_id.slice(0, 6)}</Text>
              <Text style={{ color: "#64748B", fontSize: 12 }}>{item.role}</Text>
            </View>
            {isAdmin && item.user_id !== meId && (
              <>
                <TouchableOpacity onPress={() => toggleRole(item.user_id)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", marginRight: 8 }}>
                  <Text>{item.role === "admin" ? "Make member" : "Make admin"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeMember(item.user_id)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#fee2e2" }}>
                  <Text style={{ color: "#991b1b" }}>Remove</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />

      {/* Add participants panel */}
      {adding && (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
              <Text style={{ fontWeight: "600" }}>Add participants</Text>
              <TouchableOpacity onPress={() => setAdding(false)} style={{ padding: 6 }}>
                <Text>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={{ padding: 12 }}>
              <TextInput
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  findCandidates(t);
                }}
                placeholder="Search by name"
                style={{ backgroundColor: "#f7f7f7", padding: 10, borderRadius: 8 }}
              />
            </View>
            <FlatList
              data={candidates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => addMember(item.id)} style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
                  ) : (
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#eee", marginRight: 10 }} />
                  )}
                  <Text style={{ flex: 1 }}>{item.full_name || item.id.slice(0, 6)}</Text>
                  <Text style={{ color: "#64748B" }}>Add</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#f2f2f2", marginLeft: 62 }} />}
              style={{ maxHeight: 380 }}
            />
          </View>
        </View>
      )}

      {/* Action buttons */}
      <View style={{ padding: 16, borderTopWidth: 0.5, borderTopColor: "#eee", backgroundColor: "#fff", gap: 12 }}>
        {/* Delete group (Admin only) */}
        {isAdmin && (
          <TouchableOpacity
            onPress={async () => {
              if (!groupId) return;
              Alert.alert(
                "Delete Group",
                "Are you sure you want to delete this group? This will remove all messages and cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      // Delete the group (cascade will handle members and messages)
                      const { error } = await supabase.from('groups').delete().eq('id', groupId);
                      if (error) {
                        Alert.alert("Error", "Failed to delete group");
                      } else {
                        // Navigate back to chats list
                        debouncedRouter.replace('/(tabs)/chat');
                      }
                    },
                  },
                ]
              );
            }}
            style={{ backgroundColor: '#dc2626', padding: 14, borderRadius: 10, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Delete Group</Text>
          </TouchableOpacity>
        )}
        
        {/* Leave group */}
        <TouchableOpacity
          onPress={async () => {
            if (!groupId || !meId) return;
            
            Alert.alert(
              "Leave Group",
              "Are you sure you want to leave this group?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Leave",
                  style: "destructive",
                  onPress: async () => {
                    const others = members.filter((m) => m.user_id !== meId);
                    const lastAdmin = members.filter((m) => m.role === 'admin').length === 1 && members.find((m) => m.user_id === meId && m.role === 'admin');
                    
                    // Informative alert; DB trigger will auto promote if needed
                    if (lastAdmin && others.length > 0) {
                      // noop: trigger will promote earliest joined member
                    }
                    
                    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', meId);
                    if (!error) debouncedRouter.back();
                  },
                },
              ]
            );
          }}
          style={{ backgroundColor: '#fee2e2', padding: 14, borderRadius: 10, alignItems: 'center' }}
        >
          <Text style={{ color: '#b91c1c', fontWeight: '600' }}>Leave Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
