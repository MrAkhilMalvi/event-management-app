import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Get all events for the feed
export const getEventsFeed = query({
  args: {
    category: v.optional(v.string()),
    location: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const eventsQuery = ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc");

    const events = args.limit
      ? await eventsQuery.take(args.limit)
      : await eventsQuery.collect();

    // Get organizer details for each event
    const eventsWithOrganizers = await Promise.all(
      events.map(async (event) => {
        const organizer = await ctx.db.get(event.organizerId);
        const appliedCount = await ctx.db
          .query("applications")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        return {
          ...event,
          organizer: organizer
            ? {
                _id: organizer._id,
                name: organizer.name,
                rating: organizer.rating,
                isVerified: organizer.isVerified,
                profileImage: organizer.profileImage,
              }
            : null,
          appliedCount: appliedCount.length,
        };
      })
    );

    // Sort highlighted events first
    return eventsWithOrganizers.sort((a, b) => {
      if (a.isHighlighted && !b.isHighlighted) return -1;
      if (!a.isHighlighted && b.isHighlighted) return 1;
      return b.dateTime - a.dateTime;
    });
  },
});

// Get single event details
export const getEventDetails = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;

    const organizer = await ctx.db.get(event.organizerId);
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const participantDetails = await Promise.all(
      participants.map(async (participant) => {
        const user = await ctx.db.get(participant.userId);
        return {
          ...participant,
          user: user
            ? {
                _id: user._id,
                name: user.name,
                profileImage: user.profileImage,
                rating: user.rating,
                skills: user.skills,
              }
            : null,
        };
      })
    );

    return {
      ...event,
      organizer: organizer
        ? {
            _id: organizer._id,
            name: organizer.name,
            rating: organizer.rating,
            isVerified: organizer.isVerified,
            profileImage: organizer.profileImage,
            phone: organizer.phone,
          }
        : null,
      appliedCount: applications.length,
      approvedCount: participants.length,
      participants: participantDetails,
    };
  },
});

// Create new event
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    organizerId: v.id("users"),
    dateTime: v.number(),
    endDateTime: v.optional(v.number()),
    location: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    requiredPeople: v.number(),
    paymentPerPerson: v.number(),
    paymentDetails: v.string(),
    category: v.string(),
    skills: v.array(v.string()),
    images: v.array(v.id("_storage")),
    extraNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const eventId = await ctx.db.insert("events", {
      ...args,
      appliedCount: 0,
      approvedCount: 0,
      status: "published",
      isHighlighted: false,
      createdAt: now,
      updatedAt: now,
    });

    return eventId;
  },
});

// Apply to event
export const applyToEvent = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already applied
    const existingApplication = await ctx.db
      .query("applications")
      .withIndex("by_event_and_user", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .unique();

    if (existingApplication) {
      throw new Error("You have already applied to this event");
    }

    const applicationId = await ctx.db.insert("applications", {
      eventId: args.eventId,
      userId: args.userId,
      status: "pending",
      appliedAt: Date.now(),
      message: args.message,
    });

    // Update event applied count
    const event = await ctx.db.get(args.eventId);
    if (event) {
      await ctx.db.patch(args.eventId, {
        appliedCount: event.appliedCount + 1,
      });
    }

    return applicationId;
  },
});

// Approve/reject application
export const respondToApplication = mutation({
  args: {
    applicationId: v.id("applications"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    organizerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      throw new Error("Application not found");
    }

    await ctx.db.patch(args.applicationId, {
      status: args.status,
      organizerNotes: args.organizerNotes,
      respondedAt: Date.now(),
    });

    // If approved, add to participants
    if (args.status === "approved") {
      const event = await ctx.db.get(application.eventId);
      if (event) {
        await ctx.db.insert("participants", {
          eventId: application.eventId,
          userId: application.userId,
          joinedAt: Date.now(),
          paymentStatus: "pending",
          paymentAmount: event.paymentPerPerson,
          attendanceConfirmed: false,
        });

        // Update event approved count
        await ctx.db.patch(application.eventId, {
          approvedCount: event.approvedCount + 1,
        });
      }
    }

    return args.applicationId;
  },
});

// Get user's applications
export const getUserApplications = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const applications = await ctx.db
      .query("applications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const applicationsWithEvents = await Promise.all(
      applications.map(async (application) => {
        const event = await ctx.db.get(application.eventId);
        const organizer = event ? await ctx.db.get(event.organizerId) : null;

        return {
          ...application,
          event: event
            ? {
                ...event,
                organizer: organizer
                  ? {
                      name: organizer.name,
                      rating: organizer.rating,
                      profileImage: organizer.profileImage,
                    }
                  : null,
              }
            : null,
        };
      })
    );

    return applicationsWithEvents;
  },
});

// Get organizer's events
export const getOrganizerEvents = query({
  args: { organizerId: v.id("users") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.organizerId))
      .order("desc")
      .collect();

    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        const applications = await ctx.db
          .query("applications")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const participants = await ctx.db
          .query("participants")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        return {
          ...event,
          applicationsCount: applications.length,
          participantsCount: participants.length,
          pendingApplications: applications.filter(
            (app) => app.status === "pending"
          ).length,
        };
      })
    );

    return eventsWithDetails;
  },
});

// Mark event as completed
export const completeEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    // Update all participant payments to "released"
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    for (const participant of participants) {
      await ctx.db.patch(participant._id, {
        paymentStatus: "released",
      });
    }

    return args.eventId;
  },
});

// Search events
export const searchEvents = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("events")
      .withSearchIndex("search_events", (q) => {
        let query = q.search("title", args.searchTerm);
        if (args.category) {
          query = query.eq("category", args.category);
        }
        return query.eq("status", "published");
      })
      .take(20);

    const eventsWithOrganizers = await Promise.all(
      events.map(async (event) => {
        const organizer = await ctx.db.get(event.organizerId);

        return {
          ...event,
          organizer: organizer
            ? {
                _id: organizer._id,
                name: organizer.name,
                rating: organizer.rating,
                isVerified: organizer.isVerified,
                profileImage: organizer.profileImage,
              }
            : null,
        };
      })
    );

    return eventsWithOrganizers;
  },
});

// List events
export const listEvents = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventsQuery = ctx.db.query("events").order("desc");

    if (args.limit) {
      return await eventsQuery.take(args.limit);
    }

    return await eventsQuery.collect();
  },
});
