

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

export default function MyEventsScreen() {
  const applications = useQuery(api.functions.events.getUserApplications, {
    userId: MOCK_USER_ID,
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPayment = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "#34C759";
      case "rejected":
        return "#FF3B30";
      case "pending":
        return "#FF9500";
      default:
        return "#8E8E93";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return "checkmark-circle";
      case "rejected":
        return "close-circle";
      case "pending":
        return "time";
      default:
        return "help-circle";
    }
  };

  const handleEventPress = (eventId: Id<"events">) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/event/${eventId}`);
  };

  if (applications === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Applications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your applications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Applications</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyTitle}>No Applications Yet</Text>
          <Text style={styles.emptySubtitle}>
            Start applying to events to see them here
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
        <Text style={styles.headerTitle}>My Applications</Text>
        <Text style={styles.headerSubtitle}>
          {applications.length} application{applications.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {applications.map((application:any) => (
          <TouchableOpacity
            key={application._id}
            style={styles.applicationCard}
            onPress={() => application.event && handleEventPress(application.event._id)}
          >
            <View style={styles.applicationHeader}>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {application.event?.title || "Unknown Event"}
                </Text>
                <Text style={styles.eventCategory}>
                  {application.event?.category || "Unknown Category"}
                </Text>
              </View>
         
     <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(application.status) },
                ]}
              >
                <Ionicons
                  name={getStatusIcon(application.status) as any}
                  size={14}
                  color="#FFFFFF"
                />
                <Text style={styles.statusText}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.applicationDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
                <Text style={styles.detailText}>
                  {application.event?.dateTime
                    ? formatDate(application.event.dateTime)
                    : "Date TBD"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color="#8E8E93" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {application.event?.location || "Location TBD"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={16} color="#8E8E93" />
                <Text style={styles.detailText}>
                  {application.event?.paymentPerPerson
                    ? formatPayment(application.event.paymentPerPerson)
                    : "Payment TBD"}
                </Text>
              </View>
            </View>

            {application.event?.organizer && (
              <View style={styles.organizerInfo}>
                <View style={styles.organizerAvatar}>
                  <Text style={styles.organizerInitial}>
                    {application.event.organizer.name?.charAt(0) || "?"}
                  </Text>
                </View>
                <View style={styles.organizerDetails}>
                  <Text style={styles.organizerName}>
                    {application.event.organizer.name || "Unknown Organizer"}
                  </Text>
                  <View style={styles.organizerMeta}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.organizerRating}>
                      {application.event.organizer.rating?.toFixed(1) || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.applicationFooter}>
              <Text style={styles.appliedDate}>
                Applied {formatDate(application.appliedAt)}
              </Text>
              {application.respondedAt && (
                <Text style={styles.respondedDate}>
                  Responded {formatDate(application.respondedAt)}
                </Text>
              )}
            </View>

            {application.message && (
              <View style={styles.messageContainer}>
                <Text style={styles.messageLabel}>Your message:</Text>
                <Text style={styles.messageText} numberOfLines={2}>
                  {application.message}
                </Text>
              </View>
            )}

            {application.organizerNotes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Organizer notes:</Text>
                <Text style={styles.notesText} numberOfLines={2}>
                  {application.organizerNotes}
                </Text>
              </View>
            )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5EA",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 
"bold",
    color: "#000000",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 4,
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
    padding: 16,
  },
  applicationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  eventInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  eventCategory: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  applicationDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#3C3C43",
    flex: 1,
  },
  organizerInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#E5E5EA",
    marginTop: 8,
    gap: 12,
  },
  organizerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  organizerInitial: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  organizerDetails: {
    flex: 1,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  organizerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  organizerRating: {
    fontSize: 12,
    color: "#8E8E93",
  },
  applicationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#E5E5EA",
  },
  appliedDate: {
    fontSize: 12,
    color: "#8E8E93",
  },
  respondedDate: {
    fontSize: 12,
    color: "#8E8E93",
  },
  messageContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 8,
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#8E8E93",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: "#3C3C43",
    lineHeight: 18,
  },
  notesContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#007AFF",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: "#3C3C43",
    lineHeight: 18,
  },
});