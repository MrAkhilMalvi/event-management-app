

import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Get messages for an event
export const getEventMessages = query({
  args: { 
    eventId: v.id("events"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_event_and_time", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .order("desc")
      .take(args.limit || 50);

    const messagesWithSenders = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        let replyToMessage = null;
        
        if (message.replyTo) {
          const originalMessage = await ctx.db.get(message.replyTo);
          if (originalMessage) {
            const originalSender = await ctx.db.get(originalMessage.senderId);
            replyToMessage = {
              _id: originalMessage._id,
              content: originalMessage.content,
              sender: originalSender ? {
                name: originalSender.name,
                profileImage: originalSender.profileImage,
              } : null,
            };
          }
        }

        return {
          ...message,
          sender: sender ? {
            _id: sender._id,
            name: sender.name,
            profileImage: sender.profileImage,
          } : null,
          replyTo: replyToMessage,
        };
      })
    );

    return messagesWithSenders.reverse(); // Return in chronological order
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
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
    isAnnouncement: v.optional(v.boolean()),
    attachments: v.optional(v.array(v.id("_storage"))),
    replyTo: v.optional(v.id("messages")),

    pollOptions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Verify user is part of the event (either organizer or participant)
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const isOrganizer = event.organizerId === args.senderId;
    
    if (!isOrganizer) {
      const participant = await ctx.db
        .query("participants")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .filter((q) => q.eq(q.field("userId"), args.senderId))
        .unique();

      if (!participant) {
        throw new Error("You are not authorized to send messages in this event");
      }
    }

    // Only organizers can send announcements
    const isAnnouncement = args.isAnnouncement && isOrganizer;

    const messageId = await ctx.db.insert("messages", {
      eventId: args.eventId,
      senderId: args.senderId,
      content: args.content,
      messageType: args.messageType,
      isAnnouncement: isAnnouncement || false,
      attachments: args.attachments || [],
      replyTo: args.replyTo,
      pollOptions: args.pollOptions,
      pollVotes: args.pollOptions ? 
        Object.fromEntries(args.pollOptions.map(option => [option, []])) : 
        undefined,
      sentAt: Date.now(),
      isDeleted: false,
    });

    return messageId;
  },
});

// Vote in a poll
export const voteInPoll = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    option: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message || message.messageType !== "poll" || !message.pollVotes) {
      throw new Error("Invalid poll message");
    }

    // Verify user is part of the event
    const event = await ctx.db.get(message.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const isOrganizer = event.organizerId === args.userId;
    const participant = await ctx.db
      .query("participants")
      .withIndex("by_event", (q) => q.eq("eventId", message.eventId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .unique();

    if (!isOrganizer && !participant) {
      throw new Error("You are not authorized to vote in this poll");
    }

    // Remove user from all options first (to handle vote changes)
    const updatedVotes = { ...message.pollVotes };
    Object.keys(updatedVotes).forEach(option => {
      updatedVotes[option] = updatedVotes[option].filter(id => id !== args.userId);
    });

    // Add user to selected option
    if (updatedVotes[args.option]) {
      updatedVotes[args.option].push(args.userId);
    }

    await ctx.db.patch(args.messageId, {
      pollVotes: updatedVotes,
    });

    return args.messageId;
  },
});

// Edit a message
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== args.userId) {
      throw new Error("You can only edit your own messages");
    }

    // Can't edit messages older than 24 hours
    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (Date.now() - message.sentAt > twentyFourHours) {
      throw new Error("Cannot edit messages older than 24 hours");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
      editedAt: Date.now(),
    });

    return args.messageId;
  },
});

// Delete a message
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is sender or event organizer
    const event = await ctx.db.get(message.eventId);
    const canDelete = message.senderId === args.userId || 
                     (event && event.organizerId === args.userId);

    if (!canDelete) {
      throw new Error("You are not authorized to delete this message");
    }

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      content: "This message was deleted",
    });

    return args.messageId;
  },
});

// Get event announcements only
export const getEventAnnouncements = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const announcements = await ctx.db
      .query("messages")
      .withIndex("by_event_and_time", (q) => q.eq("eventId", args.eventId))
      .filter((q) => 
        q.and(
          q.eq(q.field("isAnnouncement"), true),
          q.eq(q.field("isDeleted"), false)
        )
      )
      .order("desc")
      .take(10);

    const announcementsWithSenders = await Promise.all(
      announcements.map(async (announcement) => {
        const sender = await ctx.db.get(announcement.senderId);
        return {
          ...announcement,
          sender: sender ? {
            _id: sender._id,
            name: sender.name,
            profileImage: sender.profileImage,
          } : null,
        };
      })
    );

    return announcementsWithSenders;
  },
});

// Get unread message count for user
export const getUnreadMessageCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all events user is part of
    const participantEvents = await ctx.db
      .query("participants")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const organizerEvents = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", args.userId))
      .collect();

    const allEventIds = [
      ...participantEvents.map(p => p.eventId),
      ...organizerEvents.map(e => e._id),
    ];

    let totalUnread = 0;

    for (const eventId of allEventIds) {
      // This is a simplified version - in a real app, you'd track last read timestamps
      const recentMessages = await ctx.db
        .query("messages")
        .withIndex("by_event_and_time", (q) => q.eq("eventId", eventId))
        .filter((q) => 
          q.and(
            q.neq(q.field("senderId"), args.userId),
            q.eq(q.field("isDeleted"), false),
            q.gt(q.field("sentAt"), Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          )
        )
        .collect();

      totalUnread += recentMessages.length;
    }

    return totalUnread;
  },
});