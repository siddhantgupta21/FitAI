import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    // Read the body to avoid unused var error (even if not needed)
    await request.json(); // You can ignore the result if you don't need it

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: "User not found in Clerk." },
        { status: 404 }
      );
    }

    const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
    if (!email) {
      return NextResponse.json(
        { error: "User does not have an email address." },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: clerkUser.id },
    });

    if (existingProfile) {
      return NextResponse.json({ message: "Profile already exists." });
    }

    // Create the profile
    await prisma.profile.create({
      data: {
        userId: clerkUser.id,
        email,
        subscriptionActive: false,
        subscriptionTier: null,
        stripeSubscriptionId: null,
      },
    });

    console.log(`Prisma profile created for user: ${clerkUser.id}`);
    return NextResponse.json(
      { message: "Profile created successfully." },
      { status: 201 }
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error in create-profile API:", error);
    return NextResponse.json(
      { error: "Internal Server Error." },
      { status: 500 }
    );
  }
}
