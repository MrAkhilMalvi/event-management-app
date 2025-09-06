

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";

// Mock user ID - in a real app, this would come from authentication
const MOCK_ORGANIZER_ID = "k57f21z87wz5snnjz7yc1ytjnx7q369x" as Id<"users">;

const CATEGORIES = [
  "Cultural",
  "Corporate",
  "Wedding",
  "Sports",
  "Music",
  "Photography",
  "Other",
];

const COMMON_SKILLS = [
  "Photography",
  "Videography",
  "Anchor/MC",
  "Stage Management",
  "Sound System",
  "Decoration",
  "Security",
  "Catering Help",
  "Crowd Management",
  "Technical Support",
];

export default function CreateEventScreen() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    category: "",
    requiredPeople: "",
    paymentPerPerson: "",
    paymentDetails: "",
    extraNotes: "",
  });

  const [dateTime, setDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createEvent = useMutation(api.functions.events.createEvent);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillToggle = (skill: string) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

 
   setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleCategorySelect = (category: string) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    handleInputChange("category", category);
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.title.trim()) errors.push("Event title is required");
    if (!formData.description.trim()) errors.push("Event description is required");
    if (!formData.location.trim()) errors.push("Location is required");
    if (!formData.category) errors.push("Category is required");
    if (!formData.requiredPeople || parseInt(formData.requiredPeople) < 1) {
      errors.push("Number of required people must be at least 1");
    }
    if (!formData.paymentPerPerson || parseFloat(formData.paymentPerPerson) < 0) {
      errors.push("Payment amount must be 0 or greater");
    }
    if (dateTime <= new Date()) {
      errors.push("Event date must be in the future");
    }

    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (errors.length > 0) {
      Alert.alert("Validation Error", errors.join("\n"));
      return;
    }

    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);

    try {
      await createEvent({
        title: formData.title.trim(),
        description: formData.description.trim(),
        organizerId: MOCK_ORGANIZER_ID,
        dateTime: dateTime.getTime(),
        endDateTime: endDateTime?.getTime(),
        location: formData.location.trim(),
        requiredPeople: parseInt(formData.requiredPeople),
        paymentPerPerson: parseFloat(formData.paymentPerPerson),
        paymentDetails: formData.paymentDetails.trim() || `₹${formData.paymentPerPerson} per person`,
        category: formData.category,
        skills: selectedSkills,
        images: [], // TODO: Add image upload functionality
        extraNotes: formData.extraNotes.trim(),
      });

      Alert.alert(
        "Event Created!",
        "Your event has been published and is now visible to potential participants.",
        [
          {
            text: "OK",
            onPress: () => {
              // Reset form
              setFormData({
                title: "",
                description: "",
                location: "",
                category: "",
                requiredPeople: "",
                paymentPerPerson: "",
                paymentDetails: "",
                extraNotes: "",
              });
              setDateTime(new Date());
              setEndDateTime(null);
              setSelectedSkills([]);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to create event"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create Event</Text>
        <TouchableOpacity
          style={[styles.publishButton, isSubmitting && styles.publishButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.publishButtonText}>
            {isSubmitting ? "Publishing..." : "Publish"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Navratri Night Garba"
              value={formData.title}
              onChangeText={(value) => handleInputChange("title", value)}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Describe your event, what participants will do, and any special requirements..."
              value={formData.description}
              onChangeText={(value) => handleInputChange("description", value)}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
            >
              {CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    formData.category === category && styles.categoryButtonActive,
                  ]}
                  onPress={() => handleCategorySelect(category)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      formData.category === category && styles.categoryButtonTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date & Time</Text>
          
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={styles.dateTimeText}>{formatDateTime(dateTime)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Ionicons name="time-outline" size={20} color="#007AFF" />
            <Text style={styles.dateTimeText}>
              {endDateTime ? `End: ${formatDateTime(endDateTime)}` : "Set End Time (Optional)"}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Event Location *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Ahmedabad Club, SG Highway"
              value={formData.location}
              onChangeText={(value) => handleInputChange("location", value)}
              maxLength={200}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Team Requirements</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of People Needed *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 10"
              value={formData.requiredPeople}
              onChangeText={(value) => handleInputChange("requiredPeople", value)}
              keyboardType="numeric"
              maxLength={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Required Skills</Text>
            <View style={styles.skillsContainer}>
              {COMMON_SKILLS.map((skill) => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.skillButton,
                    selectedSkills.includes(skill) && styles.skillButtonActive,
                  ]}
                  onPress={() => handleSkillToggle(skill)}
                >
                  <Text
                    style={[
                      styles.skillButtonText,
                      selectedSkills.includes(skill) && styles.skillButtonTextActive,
                    ]}
                  >
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment per Person *</Text>
            <View style={styles.paymentInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.paymentInput}
                placeholder="800"
                value={formData.paymentPerPerson}
                onChangeText={(value) => handleInputChange("paymentPerPerson", value)}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Payment Details</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., ₹800 + ₹100 petrol allowance"
              value={formData.paymentDetails}
              onChangeText={(value) => handleInputChange("paymentDetails", value)}
              maxLength={200}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Extra Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Any additional information, special instructions, or requirements..."
              value={formData.extraNotes}
              onChangeText={(value) => handleInputChange("extraNotes", value)}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={dateTime}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDateTime(selectedDate);
            }
          }}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={endDateTime || new Date(dateTime.getTime() + 2 * 60 * 60 * 1000)}
          mode="datetime"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndTimePicker(false);
            if (selectedDate) {
              setEndDateTime(selectedDate);
            }
          }}
        />
      )}
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
    borderBottomColor
: "#E5E5EA",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  publishButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  publishButtonDisabled: {
    backgroundColor: "#8E8E93",
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#3C3C43",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#000000",
    borderWidth: 1,
    borderColor: "transparent",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  categoriesContainer: {
    flexDirection: "row",
  },
  categoryButton: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: "#007AFF",
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
  },
  categoryButtonTextActive: {
    color: "#FFFFFF",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 12,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillButton: {
    backgroundColor: "#F2F2F7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  skillButtonActive: {
    backgroundColor: "#007AFF",
  },
  skillButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#8E8E93",
  },
  skillButtonTextActive: {
    color: "#FFFFFF",
  },
  paymentInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3C3C43",
    marginRight: 8,
  },
  paymentInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  bottomSpacing: {
    height: 40,
  },
});