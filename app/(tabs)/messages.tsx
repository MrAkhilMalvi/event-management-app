

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

// Mock user ID - in a real app, this would come from authentication
const MOCK_USER_ID = "k57f21z87wz5snnjz7yc1ytjnx7q369x" as Id<"users">;

export default function MessagesScreen() {
  const unreadCount = useQuery(api.functions.messages.getUnreadMessageCount, {
    userId: MOCK_USER_ID,
  });

  const userApplications = useQuery(api.functions.events.getUserApplications, {
    userId: MOCK_USER_ID,
  });

  const organizerEvents = useQuery(api.functions.events.getOrganizerEvents, {
    organizerId: MOCK_USER_ID,
  });


  const handleEventChatPress = (eventId: Id<"events">, eventTitle: string) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/chat/${eventId}`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {

      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  // Get all events user is involved in (as participant or organizer)
  const approvedApplications = userApplications?.filter((app:any) => app.status === "approved") || [];
  const allEvents = [
    ...(organizerEvents || []).map((event:any) => ({ ...event, role: "organizer" as const })),
    ...approvedApplications.map((app:any) => ({ ...app.event!, role: "participant" as const }))
  ].filter(Boolean);

  if (userApplications === undefined || organizerEvents === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (allEvents.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyTitle}>No Event Chats</Text>
          <Text style={styles.emptySubtitle}>
            Join or create events to start chatting with other participants
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push("/(tabs)/feed")}
          >
            <Text style={styles.browseButtonText}>Browse Events</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        {unreadCount !== undefined && unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Event Chats</Text>
        
        {allEvents.map((event) => (
          <TouchableOpacity
            key={event._id}
            style={styles.chatItem}
            onPress={() => handleEventChatPress(event._id, event.title)}
          >
            <View style={styles.chatAvatar}>
              <Text style={styles.chatAvatarText}>
                {event.title.charAt(0).toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.chatInfo}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {event.title}
                </Text>
                <Text style={styles.chatTime}>
                  {formatDate(event.dateTime)}
                </Text>
              </View>
              
              <View style={styles.chatMeta}>
                <View style={styles.roleContainer}>
                  <Ionicons 
                    name={event.role === "organizer" ? "star" : "person"} 
                    size={12} 
                    color={event.role === "organizer" ? "#FF9500" : "#007AFF"} 
                  />
                  <Text style={[
                    styles.roleText,
                    { color: event.role === "organizer" ? "#FF9500" : "#007AFF" }
                  ]}>
                    {event.role === "organizer" ? "Organizer" : "Participant"}
                  </Text>
                </View>
                
                <Text style={styles.chatSubtitle} numberOfLines={1}>
                  {event.category} • {event.location}
                </Text>
 
             </View>
            </View>
            
            <View style={styles.chatActions}>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5EA",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
  },
  unreadBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: "center",
  },
  unreadText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#3C3C43",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5EA",
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
    marginRight: 8,
  },
  chatTime: {
    fontSize: 14,
    color: "#8E8E93",
  },
  chatMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "500",
  },
  chatSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    flex: 1,
    textAlign: "right",
  },
  chatActions: {
    marginLeft: 12,
  },
});