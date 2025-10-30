import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { pickMedia, uploadMedia } from "../../lib/media";

type Profile = { id: string; full_name?: string | null; avatar_url?: string | null };

export default function CreateGroupScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const meId = user?.id as string | undefined;

  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").limit(50);
      const list = (data as Profile[] | null) || [];
      setProfiles(list.filter((p) => p.id !== meId));
    };
    load();
  }, [meId]);

  const pickAvatar = useCallback(async () => {
    if (!meId) return;
    const media = await pickMedia();
    if (!media) return;
    // Only accept images for avatar
    const type = (media as any).type === 'video' ? null : 'image';
    if (!type) return;
    const publicUrl = await uploadMedia(media.uri, meId, "image", media.fileName, media.mimeType);
    if (publicUrl) setAvatarUrl(publicUrl);
  }, [meId]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const onCreate = useCallback(async () => {
    if (!meId) return;
    const groupName = name.trim();
    if (!groupName) return;
    setSubmitting(true);
    const { data: group, error } = await supabase
      .from("groups")
      .insert({ name: groupName, avatar_url: avatarUrl, created_by: meId })
      .select()
      .single();
    if (error || !group) {
      setSubmitting(false);
      return;
    }
    const groupId = (group as any).id as string;
    const memberIds = Object.keys(selected).filter((k) => selected[k]);
    const rows = [{ group_id: groupId, user_id: meId, role: "admin" }, ...memberIds.map((uid) => ({ group_id: groupId, user_id: uid }))];
    if (rows.length) {
      await supabase.from("group_members").insert(rows);
    }
    setSubmitting(false);
    router.replace(`/chat/group/${groupId}`);
  }, [meId, name, avatarUrl, selected]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: "#eee", flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Text style={{ fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>New Group</Text>
      </View>

      <View style={{ padding: 16 }}>
        <TouchableOpacity onPress={pickAvatar} style={{ alignSelf: "center", marginBottom: 12 }}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 80, height: 80, borderRadius: 40 }} />
          ) : (
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" }}>
              <Text>Pick photo</Text>
            </View>
          )}
        </TouchableOpacity>
        <TextInput
          placeholder="Group name"
          value={name}
          onChangeText={setName}
          style={{ backgroundColor: "#f7f7f7", padding: 12, borderRadius: 8 }}
        />
      </View>

      <Text style={{ marginHorizontal: 16, marginBottom: 8, color: "#666", fontSize: 12 }}>Add participants</Text>
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => toggleSelect(item.id)} style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center" }}>
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
            ) : (
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#eee", marginRight: 10 }} />
            )}
            <Text style={{ flex: 1 }}>{item.full_name || item.id.slice(0, 6)}</Text>
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: selected[item.id] ? "#007AFF" : "#ccc",
                backgroundColor: selected[item.id] ? "#007AFF" : "transparent",
              }}
            />
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 62 }} />}
      />

      <View style={{ padding: 16, borderTopWidth: 0.5, borderTopColor: "#eee", backgroundColor: "#fff" }}>
        <TouchableOpacity
          onPress={onCreate}
          disabled={!name.trim() || submitting}
          style={{ backgroundColor: "#007AFF", padding: 14, borderRadius: 10, alignItems: "center", opacity: !name.trim() || submitting ? 0.6 : 1 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Create Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
