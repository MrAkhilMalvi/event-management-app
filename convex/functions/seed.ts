

import { mutation } from "../_generated/server";
import { v } from "convex/values";

// Seed initial data for testing
export const seedInitialData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if data already exists
    const existingUsers = await ctx.db.query("users").take(1);
    if (existingUsers.length > 0) {
      return "Data already exists";
    }

    // Create mock user
    const mockUserId = await ctx.db.insert("users", {
      name: "John Doe",
      email: "john@example.com",
      phone: "+91 9876543210",
      userType: "both",
      skills: ["Photography", "Event Management", "Sound Setup"],
      bio: "Experienced event photographer and organizer with 5+ years in the industry.",
      location: "Mumbai, Maharashtra",
      rating: 4.8,
      totalRatings: 24,
      eventsAttended: 15,
      eventsOrganized: 8,
      isVerified: true,
      isPremium: false,
      createdAt: Date.now(),
    });

    // Create organizer user
    const organizerId = await ctx.db.insert("users", {
      name: "Priya Sharma",
      email: "priya@example.com",
      phone: "+91 9876543211",
      userType: "organizer",
      skills: ["Event Planning", "Coordination", "Vendor Management"],
      bio: "Professional event organizer specializing in cultural and corporate events.",
      location: "Delhi, India",
      rating: 4.9,
      totalRatings: 45,
      eventsAttended: 3,
      eventsOrganized: 32,
      isVerified: true,
      isPremium: true,
      createdAt: Date.now(),
    });

    // Create sample events
    const now = Date.now();
    const tomorrow = now + 24 * 60 * 60 * 1000;
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;

    const event1Id = await ctx.db.insert("events", {
      title: "Navratri Garba Night 2024",
      description: "Join us for an amazing Navratri celebration with traditional Garba and Dandiya. We need enthusiastic volunteers to help with stage management, sound setup, and crowd coordination.",
      organizerId: organizerId,
      dateTime: tomorrow + 6 * 60 * 60 * 1000, // Tomorrow 6 PM

      endDateTime: tomorrow + 13 * 60 * 60 * 1000, // Tomorrow 1 AM
      location: "Sardar Patel Stadium, Ahmedabad",
      latitude: 23.0225,
      longitude: 72.5714,
      requiredPeople: 15,
      appliedCount: 8,
      approvedCount: 5,
      paymentPerPerson: 800,
      paymentDetails: "₹800 + ₹100 petrol allowance",
      category: "Cultural",
      skills: ["Stage Management", "Sound Setup", "Crowd Control", "Photography"],
      status: "published",
      isHighlighted: true,
      highlightExpiresAt: now + 3 * 24 * 60 * 60 * 1000,
      images: [],
      extraNotes: "Traditional attire preferred. Dinner and refreshments will be provided.",
      createdAt: now,
      updatedAt: now,
    });

    const event2Id = await ctx.db.insert("events", {
      title: "Corporate Annual Day Setup",
      description: "Help us set up for a major corporate annual day event. Looking for people with experience in stage setup, lighting, and event coordination.",
      organizerId: organizerId,
      dateTime: nextWeek,
      endDateTime: nextWeek + 8 * 60 * 60 * 1000,
      location: "Hyatt Regency, Mumbai",
      latitude: 19.0760,
      longitude: 72.8777,
      requiredPeople: 20,
      appliedCount: 12,
      approvedCount: 8,
      paymentPerPerson: 1200,
      paymentDetails: "₹1200 per day + meals",
      category: "Corporate",
      skills: ["Stage Setup", "Lighting", "Audio Visual", "Coordination"],
      status: "published",
      isHighlighted: false,
      images: [],
      extraNotes: "Professional attire required. 2-day event commitment needed.",
      createdAt: now,
      updatedAt: now,
    });

    const event3Id = await ctx.db.insert("events", {
      title: "Wedding Photography Assistance",
      description: "Seeking assistant photographers for a grand Indian wedding. Great opportunity for photography enthusiasts to learn and earn.",
      organizerId: mockUserId,
      dateTime: now + 3 * 24 * 60 * 60 * 1000,
      endDateTime: now + 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000,
      location: "Taj Palace, New Delhi",
      latitude: 28.6139,
      longitude: 77.2090,
      requiredPeople: 5,
      appliedCount: 3,
      approvedCount: 2,
      paymentPerPerson: 1500,
      paymentDetails: "₹1500 + meals + accommodation",
      category: "Wedding",
      skills: ["Photography", "Video Recording", "Equipment Handling"],
      status: "published",
      isHighlighted: false,
      images: [],
      extraNotes: "Own camera equipment preferred but not mandatory.",
      createdAt: now,
      updatedAt: now,
    });

    // Create some applications
    await ctx.db.insert("applications", {
      eventId: event1Id,
      userId: mockUserId,
      status: "approved",
      appliedAt: now - 2 * 24 * 60 * 60 * 1000,
      respondedAt: now - 1 * 24 * 60 * 60 * 1000,
      message: "I have 3 years of experience in event management and would love to help with this Garba night!",
      organizerNotes: "Great profile! Looking forward to working with you.",
    });

    await ctx.db.insert("applications", {
      eventId: event2Id,
      userId: mockUserId,
      status: "pending",
      appliedAt: now - 1 * 24 * 60 * 60 * 1000,
      message: "I have experience with corporate events and can help with stage setup and coordination.",
    });

    // Create participant record for approved application
    await ctx.db.insert("participants", {
      eventId: event1Id,
      userId: mockUserId,
      joinedAt: now - 1 * 24 * 60 * 60 * 1000,
      paymentStatus: "pending",
      paymentAmount: 800,
      attendanceConfirmed: false,
    });

    return {
      mockUserId,
      organizerId,
      event1Id,
      event2Id,
      event3Id
    };
  },
});
