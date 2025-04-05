export interface Plan {
    name: string;
    amount: number;
    currency: string;
    interval: string;
    isPopular?: boolean;
    description: string;
    features: string[];
  }

  export const availablePlans: Plan[] = [
    {
      name: "Weekly Plan",
      amount: 60,
      currency: "INR",
      interval: "week",
      description:
        "Great if you want to try the service before committing longer.",
      features: [
        "Unlimited AI meal plans",
        "AI nutrition insights",
        "Cancel anytime",
      ],
    },
    {
      name: "Monthly Plan",
      amount: 199,
      currency: "INR",
      interval: "month",
      isPopular: true, 
      description:
        "Perfect for ongoing, month-to-month meal planning and features.",
      features: [
        "Unlimited AI meal plans",
        "Priority AI support",
        "Cancel anytime",
      ],
    },
    {
      name: "Yearly Plan",
      amount: 999,
      currency: "INR",
      interval: "year",
      description:
        "Best value for those committed to improving their diet long-term.",
      features: [
        "Unlimited AI meal plans",
        "All premium features",
        "Cancel anytime",
      ],
    },
  ];

  const priceIdMap: Record<string, string> = {
    week: process.env.STRIPE_PRICE_WEEKLY!,
    month: process.env.STRIPE_PRICE_MONTHLY!,
    year: process.env.STRIPE_PRICE_YEARLY!,
  };

  export const getPriceIdFromType = (planType: string) => priceIdMap[planType];