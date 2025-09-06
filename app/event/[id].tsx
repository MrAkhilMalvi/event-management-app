

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";

// Mock user ID - in a real app, this would come from authentication
const MOCK_USER_ID = "mock_user_id" as Id<"users">;

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isApplying, setIsApplying] = useState(false);

  const event = useQuery(api.functions.events.getEventDetails, {
    eventId: id as Id<"events">,
  });

  const applyToEvent = useMutation(api.functions.events.applyToEvent);

  const handleApply = async () => {
    if (!event || isApplying) return;

    if (Platform.OS === "android") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Apply to Event",
      `Are you sure you want to apply for "${event.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply",
          style: "default",
          onPress: async () => {
            setIsApplying(true);
            try {
              await applyToEvent({
                eventId: event._id,
                userId: MOCK_USER_ID,
                message: "I'm interested in joining this event!",

              });
              
              Alert.alert(
                "Application Sent!",
                "Your application has been sent to the organizer. You'll be notified once they respond.",
                [{ text: "OK" }]
              );
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Failed to apply to event",
                [{ text: "OK" }]
              );
            } finally {
              setIsApplying(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenLocation = () => {
    if (!event) return;

    if (Platform.OS === "android") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const url = event.latitude && event.longitude
      ? `maps:${event.latitude},${event.longitude}`
      : `maps:0,0?q=${encodeURIComponent(event.location)}`;

    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open maps");
    });
  };

  const handleContactOrganizer = () => {
    if (!event?.organizer?.phone) return;

    if (Platform.OS === "android") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Alert.alert(
      "Contact Organizer",
      `Contact ${event.organizer.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          onPress: () => event.organizer?.phone && Linking.openURL(`tel:${event.organizer.phone}`),
        },
        {
          text: "WhatsApp",
          onPress: () => event.organizer?.phone && Linking.openURL(`whatsapp://send?phone=${event.organizer.phone}`),
        },
      ]
    );
  };

  const handleJoinChat = () => {
    if (!event) return;

    if (Platform.OS === "android") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    router.push(`/chat/${event._id}`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPayment = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  if (event === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Not Found</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Event Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This event may have been removed or doesn't exist.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isEventFull = event.approvedCount >= event.requiredPeople;
  const spotsLeft = event.requiredPeople - event.approvedCount;

  return (
    <SafeAreaView style={styles.container}>
   
   <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {event.isHighlighted && (
          <View style={styles.featuredBanner}>
            <Ionicons name="star" size={16} color="#FFFFFF" />
            <Text style={styles.featuredText}>Featured Event</Text>
          </View>
        )}

        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventCategory}>{event.category}</Text>

          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeItem}>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
              <Text style={styles.dateTimeText}>{formatDate(event.dateTime)}</Text>
            </View>
            <View style={styles.dateTimeItem}>
              <Ionicons name="time-outline" size={20} color="#007AFF" />
              <Text style={styles.dateTimeText}>
                {formatTime(event.dateTime)}
                {event.endDateTime && ` - ${formatTime(event.endDateTime)}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.locationContainer}
            onPress={handleOpenLocation}
          >
            <Ionicons name="location-outline" size={20} color="#007AFF" />
            <Text style={styles.locationText}>{event.location}</Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>

          <View style={styles.paymentContainer}>
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentAmount}>
                {formatPayment(event.paymentPerPerson)}
              </Text>
            </View>
            <Text style={styles.paymentDetails}>{event.paymentDetails}</Text>
          </View>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{event.description}</Text>
          
          {event.extraNotes && (
            <>
              <Text style={styles.sectionTitle}>Additional Notes</Text>
              <Text style={styles.descriptionText}>{event.extraNotes}</Text>
            </>
          )}
        </View>

        {event.skills && event.skills.length > 0 && (
          <View style={styles.skillsCard}>
            <Text style={styles.sectionTitle}>Required Skills</Text>
            <View style={styles.skillsContainer}>
              {event.skills.map((skill:any, index:any) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Event Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{event.appliedCount}</Text>
              <Text style={styles.statLabel}>Applied</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{event.approvedCount}</Text>
              <Text style={styles.statLabel}>Approved</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{spotsLeft}</Text>
  
            <Text style={styles.statLabel}>Spots Left</Text>
            </View>
          </View>
          
          {isEventFull && (
            <View style={styles.fullBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.fullText}>Event is Full</Text>
            </View>
          )}
        </View>

        {event.organizer && event.organizer.phone && (
          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Contact Organizer</Text>
            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => event.organizer?.phone && Linking.openURL(`tel:${event.organizer.phone}`)}
              >
                <Ionicons name="call" size={20} color="#007AFF" />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => event.organizer?.phone && Linking.openURL(`whatsapp://send?phone=${event.organizer.phone}`)}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                <Text style={styles.contactButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.organizerCard}
          onPress={handleContactOrganizer}
        >
          <View style={styles.organizerInfo}>
            <View style={styles.organizerAvatar}>
              <Text style={styles.organizerInitial}>
                {event.organizer?.name?.charAt(0) || "?"}
              </Text>
            </View>
            <View style={styles.organizerDetails}>
              <Text style={styles.organizerName}>
                {event.organizer?.name || "Unknown Organizer"}
              </Text>
              <View style={styles.organizerMeta}>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {event.organizer?.rating?.toFixed(1) || "N/A"}
                  </Text>
                </View>
                {event.organizer?.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#007AFF" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </TouchableOpacity>

        {event.participants && event.participants.length > 0 && (
          <View style={styles.participantsCard}>
            <Text style={styles.sectionTitle}>Participants</Text>
            {event.participants.slice(0, 5).map((participant:any, index:any) => (
              <View key={index} style={styles.participantItem}>
                <View style={styles.participantAvatar}>
                  <Text style={styles.participantInitial}>
                    {participant.user?.name?.charAt(0) || "?"}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <Text style={styles.participantName}>
                    {participant.user?.name || "Unknown"}
                  </Text>
                  <View style={styles.participantMeta}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.participantRating}>
                      {participant.user?.rating?.toFixed(1) || "N/A"}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
            {event.participants.length > 5 && (
              <Text style={styles.moreParticipants}>
                +{event.participants.length - 5} more participants
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleJoinChat}
        >
          <Ionicons name="chatbubbles-outline" size={20} color="#007AFF" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.applyButton,
            (isEventFull || isApplying) && styles.applyButtonDisabled,
          ]}
          onPress={handleApply}
          disabled={isEventFull || isApplying}
        >
          <Text style={styles.applyButtonText}>
            {isApplying
              ? "Applying..."
              : isEventFull
              ? "Event Full"
              : "Apply Now"}
          </Text>
        </TouchableOpacity>
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
    justifyContent: "space-between",
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  shareButton: {
    padding: 8,
    marginRight: -8,
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#3C3C43",
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  featuredBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF9500",
    paddingVertical: 8,
    gap: 8,
  },
  featuredText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 4,
  },
  eventCategory: {
    fontSize: 14,
    color: "#8E8E93",
    fontWeight: "500",
    marginBottom: 20,
  },
  dateTimeContainer: {
    marginBottom: 16,
    gap: 12,
  },
  dateTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateTimeText: {
    fontSize: 16,
    color: "#3C3C43",
    fontWeight: "500",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    marginBottom: 16,
  },
  locationText: {
    flex: 1,
    fontSize: 16,
    color: "#3C3C43",
    fontWeight: "500",
  },
  paymentContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentBadge: {
    backgroundColor: "#34C759",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  paymentDetails: {
    flex: 1,
    fontSize: 14,
    color: "#8E8E93",
  },
  descriptionCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: "#3C3C43",
    lineHeight: 24,
    marginBottom: 16,
  },
  skillsCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 
12,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillTag: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 14,
    color: "#3C3C43",
    fontWeight: "500",
  },
  statsCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  statLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E5EA",
  },
  fullBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  fullText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#34C759",
  },
  organizerCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  organizerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  organizerInitial: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  organizerDetails: {
    gap: 4,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  organizerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  participantsCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 12,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#8E8E93",
    justifyContent: "center",
    alignItems: "center",
  },
  participantInitial: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  participantMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  participantRating: {
    fontSize: 12,
    color: "#8E8E93",
  },
  moreParticipants: {
    fontSize: 14,
    color: "#8E8E93",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 8,
  },
  bottomActions: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E5EA",
    gap: 12,
  },
  chatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonDisabled: {
    backgroundColor: "#8E8E93",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  contactSection: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginBottom: 12,
  },
  contactButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#007AFF",
  },
});