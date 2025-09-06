

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const event = useQuery(api.functions.events.getEventDetails, {
    eventId: id as Id<"events">,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {event?.title || "Event Chat"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {event?.approvedCount || 0} participants
          </Text>
        </View>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.comingSoonContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color="#8E8E93" />
          <Text style={styles.comingSoonTitle}>Chat Coming Soon!</Text>
          <Text style={styles.comingSoonSubtitle}>
            Real-time messaging for event participants will be available soon.
          </Text>
          <Text style={styles.comingSoonFeatures}>
            Features coming:
            {"\n"}• Group messaging
            {"\n"}• Announcements from organizers
            {"\n"}• Location sharing
            {"\n"}• Quick polls
            {"\n"}• File sharing
          </Text>
        </View>
      </View>
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
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5EA",
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 2,
  },
  infoButton: {
    padding: 8,
    marginRight: -8,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  comingSoonContainer: {
    alignItems: "center",
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#3C3C43",
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  comingSoonFeatures: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
  },
});
