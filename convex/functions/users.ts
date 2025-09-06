import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Create or update user profile
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    userType: v.union(
      v.literal("organizer"),
      v.literal("participant"),
      v.literal("both")
    ),
    skills: v.array(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        ...args,
      });
      return existingUser._id;
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      ...args,
      rating: 5.0,
      totalRatings: 0,
      eventsAttended: 0,
      eventsOrganized: 0,
      isVerified: false,
      isPremium: false,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get user profile
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user;
  },
});

// Get user profile
export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get recent ratings
    const recentRatings = await ctx.db
      .query("ratings")
      .withIndex("by_rated_user", (q) => q.eq("ratedUserId", args.userId))
      .order("desc")
      .take(5);

    const ratingsWithDetails = await Promise.all(
      recentRatings.map(async (rating) => {
        const rater = await ctx.db.get(rating.raterId);
        const event = await ctx.db.get(rating.eventId);
        return {
          ...rating,
          rater: rater
            ? { name: rater.name, profileImage: rater.profileImage }
            : null,
          event: event ? { title: event.title } : null,
        };
      })
    );

    return {
      ...user,
      recentRatings: ratingsWithDetails,
    };
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    profileImage: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(userId, cleanUpdates);
    return userId;
  },
});

// Get user by email (for login)
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    return user;
  },
});

// Get user by phone
export const getUserByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .unique();

    return user;
  },
});

// Rate a user
export const rateUser = mutation({
  args: {
    eventId: v.id("events"),
    raterId: v.id("users"),
    ratedUserId: v.id("users"),
    rating: v.number(),
    review: v.optional(v.string()),
    ratingType: v.union(
      v.literal("organizer_to_participant"),
      v.literal("participant_to_organizer")
    ),
  },
  handler: async (ctx, args) => {
    // Check if rating already exists
    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) =>
        q.and(
          q.eq(q.field("raterId"), args.raterId),
          q.eq(q.field("ratedUserId"), args.ratedUserId)
        )
      )
      .unique();

    if (existingRating) {
      throw new Error("You have already rated this user for this event");
    }

    // Validate rating range
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Create rating
    const ratingId = await ctx.db.insert("ratings", {
      ...args,
      createdAt: Date.now(),
    });

    // Update user's average rating
    const user = await ctx.db.get(args.ratedUserId);
    if (user) {
      const newTotalRatings = user.totalRatings + 1;
      const newAverageRating =
        (user.rating * user.totalRatings + args.rating) / newTotalRatings;

      await ctx.db.patch(args.ratedUserId, {
        rating: Math.round(newAverageRating * 10) / 10, // Round to 1 decimal
        totalRatings: newTotalRatings,
      });
    }

    return ratingId;
  },
});

// Get top-rated users
export const getTopRatedUsers = query({
  args: {
    userType: v.optional(
      v.union(v.literal("organizer"), v.literal("participant"))
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("users").withIndex("by_rating");

    if (args.userType) {
      query = query.filter((q) =>
        q.or(
          q.eq(q.field("userType"), args.userType),
          q.eq(q.field("userType"), "both")
        )
      );
    }

    const users = await query.order("desc").take(args.limit || 10);

    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      rating: user.rating,
      totalRatings: user.totalRatings,
      eventsAttended: user.eventsAttended,
      eventsOrganized: user.eventsOrganized,
      skills: user.skills,
      profileImage: user.profileImage,
      isVerified: user.isVerified,
      location: user.location,
    }));
  },
});

// Update user stats after event completion
export const updateUserStats = mutation({
  args: {
    userId: v.id("users"),
    eventCompleted: v.boolean(),
    asOrganizer: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    const updates: any = {};

    if (args.eventCompleted) {
      if (args.asOrganizer) {
        updates.eventsOrganized = user.eventsOrganized + 1;
      } else {
        updates.eventsAttended = user.eventsAttended + 1;
      }
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.userId, updates);
    }

    return args.userId;
  },
});

// Search users by skills or name
export const searchUsers = query({
  args: {
    searchTerm: v.string(),
    userType: v.optional(
      v.union(v.literal("organizer"), v.literal("participant"))
    ),
  },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();

    const filteredUsers = allUsers.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(args.searchTerm.toLowerCase()) ||
        user.skills.some((skill) =>
          skill.toLowerCase().includes(args.searchTerm.toLowerCase())
        ) ||
        (user.location &&
          user.location.toLowerCase().includes(args.searchTerm.toLowerCase()));

      const matchesType =
        !args.userType ||
        user.userType === args.userType ||
        user.userType === "both";

      return matchesSearch && matchesType;
    });

    return filteredUsers
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20)
      .map((user) => ({
        _id: user._id,
        name: user.name,
        rating: user.rating,
        totalRatings: user.totalRatings,
        skills: user.skills,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
        location: user.location,
        userType: user.userType,
      }));
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
    profileImage: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;

    await ctx.db.patch(userId, {
      ...updates,
    });

    return await ctx.db.get(userId);
  },
});
