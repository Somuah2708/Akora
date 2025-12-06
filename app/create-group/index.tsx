import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, FlatList, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { DebouncedTouchable } from '@/components/DebouncedTouchable';
import { debouncedRouter } from '@/utils/navigationDebounce';
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { pickMedia, uploadMedia } from "../../lib/media";
import { getFriends } from "../../lib/friends";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!meId) return;
      try {
        setLoading(true);
        const friends = await getFriends(meId);
        // Extract friend profiles from the friends relationship
        const friendProfiles = friends.map((f) => ({
          id: f.friend.id,
          full_name: f.friend.full_name,
          avatar_url: f.friend.avatar_url,
        }));
        setProfiles(friendProfiles);
      } catch (error) {
        console.error("Error loading friends:", error);
      } finally {
        setLoading(false);
      }
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
    
    // Use RPC to create group atomically with members
    const memberIds = Object.keys(selected).filter((k) => selected[k]);
    const { data: groupId, error } = await supabase.rpc("create_group", {
      p_name: groupName,
      p_avatar_url: avatarUrl || null,
      p_creator_id: meId,
      p_member_ids: memberIds.length > 0 ? memberIds : null,
    });
    
    if (error || !groupId) {
      console.error("Error creating group:", error);
      setSubmitting(false);
      return;
    }
    
    setSubmitting(false);
    debouncedRouter.replace(`/chat/group/${groupId}`);
  }, [meId, name, avatarUrl, selected, router]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View style={{ paddingTop: 52, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: "#eee", flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={() => debouncedRouter.back()} style={{ padding: 8, marginRight: 8 }}>
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

      <Text style={{ marginHorizontal: 16, marginBottom: 8, color: "#666", fontSize: 12 }}>
        Add participants (Friends only)
      </Text>
      
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 12, color: "#666" }}>Loading friends...</Text>
        </View>
      ) : profiles.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8, textAlign: "center" }}>
            No friends yet
          </Text>
          <Text style={{ fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 }}>
            Add friends first to create a group. You can only add people from your friends list to group chats.
          </Text>
        </View>
      ) : (
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
      )}

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
