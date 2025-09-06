

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - both organizers and participants
  users: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    profileImage: v.optional(v.id("_storage")),
    userType: v.union(v.literal("organizer"), v.literal("participant"), v.literal("both")),
    skills: v.array(v.string()), // e.g., ["photography", "anchor", "stage setup"]
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    rating: v.number(), // Average rating
    totalRatings: v.number(),
    eventsAttended: v.number(),
    eventsOrganized: v.number(),
    isVerified: v.boolean(),
    isPremium: v.boolean(),
    premiumExpiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_user_type", ["userType"])
    .index("by_rating", ["rating"]),

  // Events table
  events: defineTable({
    title: v.string(),
    description: v.string(),
    organizerId: v.id("users"),
    dateTime: v.number(), // Unix timestamp
    endDateTime: v.optional(v.number()),
    location: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    requiredPeople: v.number(),
    appliedCount: v.number(),
    approvedCount: v.number(),
    paymentPerPerson: v.number(),
    paymentDetails: v.string(), // e.g., "₹800 + ₹100 petrol allowance"
    category: v.string(), // e.g., "Cultural", "Corporate", "Wedding"
    skills: v.array(v.string()), // Required skills
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    isHighlighted: v.boolean(), // Premium feature
    highlightExpiresAt: v.optional(v.number()),
    images: v.array(v.id("_storage")),
    extraNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_status", ["status"])
    .index("by_date_time", ["dateTime"])
    .index("by_category", ["category"])
    .index("by_highlighted", ["isHighlighted"])
    .searchIndex("search_events", {
      searchField: "title",
      filterFields: ["status", "category", "dateTime"]
    }),

  // Event applications
  applications: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    appliedAt: v.number(),
    message: v.optional(v.string()), // Application message from user
    organizerNotes: v.optional(v.string()), // Notes from organizer
    respondedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_and_user", ["eventId", "userId"])
    .index("by_status", ["status"]),

  // Event participants (approved applications)
  participants: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    joinedAt: v.number(),
    role: v.optional(v.string()),
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("locked"),
      v.literal("released"),
      v.literal("refunded")
    ),
    paymentAmount: v.number(),
    attendanceConfirmed: v.boolean(),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_payment_status", ["paymentStatus"]),

  // Event messages/chat
  messages: defineTable({
    eventId: v.id("events"),
    senderId: v.id("users"),
    content: v.string(),
    messageType: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("location"),
      v.literal("announcement"),
      v.literal("poll")
    ),
    isAnnouncement: v.boolean(), // Only organizer can send announcements
    attachments: v.array(v.id("_storage")),
    replyTo: v.optional(v.id("messages")),
    pollOptions: v.optional(v.array(v.string())),
    pollVotes: v.optional(v.record(v.string(), v.array(v.id("users")))), // option -> userIds
    sentAt: v.number(),
    editedAt: v.optional(v.number()),
    isDeleted: v.boolean(),
  })
    .index("by_event", ["eventId"])
    .index("by_sender", ["senderId"])
    .index("by_event_and_time", ["eventId", "sentAt"]),

  // Ratings and reviews
  ratings: defineTable({
    eventId: v.id("events"),
    raterId: v.id("users"), // Who gave the rating
    ratedUserId: v.id("users"), // Who received the rating
    rating: v.number(), // 1-5 stars
    review: v.optional(v.string()),
    ratingType: v.union(v.literal("organizer_to_participant"), v.literal("participant_to_organizer")),
    createdAt: v.number(),
  })
    .index("by_event", ["eventId"])
    .index("by_rated_user", ["ratedUserId"])
    .index("by_rater", ["raterId"]),

  // Payment transactions
  payments: defineTable({
    eventId: v.id("events"),
    organizerId: v.id("users"),
    participantId: v.id("users"),
    amount: v.number(),
    platformFee: v.number(),
    netAmount: v.number(), // Amount after platform fee
    status: v.union(
      v.literal("pending"),
      v.literal("locked"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    paymentMethod: v.string(), // "UPI", "Card", etc.
    transactionId: v.optional(v.string()),
    externalPaymentId: v.optional(v.string()), // Stripe/Razorpay ID
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_organizer", ["organizerId"])
    .index("by_participant", ["participantId"])
    .index("by_status", ["status"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("application_received"),
      v.literal("application_approved"),
      v.literal("application_rejected"),
      v.literal("event_reminder"),
      v.literal("payment_received"),
      v.literal("rating_received"),
      v.literal("new_message")
    ),
    relatedEventId: v.optional(v.id("events")),
    relatedUserId: v.optional(v.id("users")),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_read", ["userId", "isRead"]),

  // Premium subscriptions
  subscriptions: defineTable({
    userId: v.id("users"),
    planType: v.union(v.literal("organizer_premium"), v.literal("participant_premium")),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("expired")),
    startDate: v.number(),
    endDate: v.number(),
    amount: v.number(),
    paymentId: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),
});