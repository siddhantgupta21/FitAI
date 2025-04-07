import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-03-31.basil",
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  // Verify Stripe event is legit
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature || "",
      webhookSecret
    );
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Webhook signature verification failed. ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error(`Stripe error: ${error.message} | EVENT TYPE: ${event.type}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({});
}

const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session
): Promise<void> => {
  const userId = session.metadata?.clerkUserId;
  if (!userId) {
    console.error("No userId found in session metadata.");
    return;
  }

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error("No subscription ID found in session.");
    return;
  }

  try {
    await prisma.profile.update({
      where: { userId },
      data: {
        stripeSubscriptionId: subscriptionId,
        subscriptionActive: true,
        subscriptionTier: session.metadata?.planType || null,
      },
    });
    console.log(`Subscription activated for user: ${userId}`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Prisma Update Error:", error.message);
  }
};

const handleInvoicePaymentFailed = async (
  invoice: Stripe.Invoice
): Promise<void> => {
  // Get subscription ID from the first invoice line item
  const subscriptionId = invoice.lines.data[0]?.subscription as string | undefined;

  if (!subscriptionId) {
    console.error("No subscription ID found in invoice lines.");
    return;
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { userId: true },
    });

    if (!profile?.userId) {
      console.error("No profile found for this subscription ID.");
      return;
    }

    await prisma.profile.update({
      where: { userId: profile.userId },
      data: { subscriptionActive: false },
    });

    console.log(`Subscription payment failed for user: ${profile.userId}`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Prisma Error:", error.message);
  }
};

const handleSubscriptionDeleted = async (
  subscription: Stripe.Subscription
): Promise<void> => {
  const subscriptionId = subscription.id;

  try {
    const profile = await prisma.profile.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
      select: { userId: true },
    });

    if (!profile?.userId) {
      console.error("No profile found for this subscription ID.");
      return;
    }

    await prisma.profile.update({
      where: { userId: profile.userId },
      data: {
        subscriptionActive: false,
        stripeSubscriptionId: null,
      },
    });

    console.log(`Subscription canceled for user: ${profile.userId}`);
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Prisma Error:", error.message);
  }
};
