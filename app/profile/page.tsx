"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { availablePlans } from "@/lib/plans";
import Image from "next/image";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/spinner";

type SubscriptionResponse = {
  subscription: {
    subscription_tier: string;
    subscription_active: boolean;
  };
};

type ChangePlanResponse = {
  message: string;
};

type UnsubscribeResponse = {
  success: boolean;
};

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<string>("");

  const {
    data: subscription,
    isLoading,
    isError,
    error,
  } = useQuery<SubscriptionResponse>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const res = await fetch("/api/profile/subscription-status");
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch subscription.");
      }
      return res.json();
    },
    enabled: isLoaded && isSignedIn,
    staleTime: 5 * 60 * 1000,
  });

  const currentPlan = availablePlans.find(
    (plan) => plan.interval === subscription?.subscription?.subscription_tier
  );

  const changePlanMutation = useMutation<ChangePlanResponse, Error, string>({
    mutationFn: async (newPlan: string) => {
      const res = await fetch("/api/profile/change-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ newPlan }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(
          errorData.error || "Failed to change subscription plan."
        );
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      toast.success("Subscription plan updated successfully.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unsubscribeMutation = useMutation<UnsubscribeResponse, Error, void>({
    mutationFn: async () => {
      const res = await fetch("/api/profile/unsubscribe", {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to unsubscribe.");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
      router.push("/subscribe");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleConfirmChangePlan = () => {
    if (selectedPlan) {
      changePlanMutation.mutate(selectedPlan);
      setSelectedPlan("");
    }
  };

  const handleChangePlan = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSelectedPlan = e.target.value;
    if (newSelectedPlan) {
      setSelectedPlan(newSelectedPlan);
    }
  };

  const handleUnsubscribe = () => {
    if (
      confirm(
        "Are you sure you want to unsubscribe? You will lose access to premium features."
      )
    ) {
      unsubscribeMutation.mutate();
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-100">
        <Spinner />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-emerald-100">
        <p>Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-100 p-4 text-black">
      <Toaster position="top-center" />
      <div className="w-full max-w-5xl bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/3 p-6 bg-emerald-500 text-white flex flex-col items-center">
            <Image
              src={user.imageUrl || "/default-avatar.png"}
              alt="User Avatar"
              width={100}
              height={100}
              className="rounded-full mb-4"
            />
            <h1 className="text-2xl font-bold mb-2">
              {user.firstName} {user.lastName}
            </h1>
            <p className="mb-4">{user.primaryEmailAddress?.emailAddress}</p>
          </div>

          <div className="w-full md:w-2/3 p-6 bg-gray-50">
            <h2 className="text-2xl font-bold mb-6 text-emerald-700">
              Subscription Details
            </h2>

            {isLoading ? (
              <div className="flex items-center">
                <Spinner />
                <span className="ml-2">Loading subscription details...</span>
              </div>
            ) : isError ? (
              <p className="text-red-500">{error?.message}</p>
            ) : subscription ? (
              <div className="space-y-6">
                <div className="bg-white shadow-md rounded-lg p-4 border border-emerald-200">
                  <h3 className="text-xl font-semibold mb-2 text-emerald-600">
                    Current Plan
                  </h3>
                  {currentPlan ? (
                    <>
                      <p>
                        <strong>Plan:</strong> {currentPlan.name}
                      </p>
                      <p>
                        <strong>Amount:</strong> ${currentPlan.amount}{" "}
                        {currentPlan.currency}
                      </p>
                      <p>
                        <strong>Status:</strong>{" "}
                        {subscription.subscription.subscription_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </p>
                    </>
                  ) : (
                    <p className="text-red-500">Current plan not found.</p>
                  )}
                </div>

                <div className="bg-white shadow-md rounded-lg p-4 border border-emerald-200">
                  <h3 className="text-xl font-semibold mb-2 text-emerald-600">
                    Change Subscription Plan
                  </h3>
                  <select
                    onChange={handleChangePlan}
                    defaultValue={currentPlan?.interval}
                    className="w-full px-3 py-2 border border-emerald-300 rounded-md text-black focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    disabled={changePlanMutation.isPending}
                  >
                    <option value="" disabled>
                      Select a new plan
                    </option>
                    {availablePlans.map((plan, key) => (
                      <option key={key} value={plan.interval}>
                        {plan.name} - ${plan.amount} / {plan.interval}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleConfirmChangePlan}
                    className="mt-3 p-2 bg-emerald-500 rounded-lg text-white"
                  >
                    Save Change
                  </button>
                  {changePlanMutation.isPending && (
                    <div className="flex items-center mt-2">
                      <Spinner />
                      <span className="ml-2">Updating plan...</span>
                    </div>
                  )}
                </div>

                <div className="bg-white shadow-md rounded-lg p-4 border border-emerald-200">
                  <h3 className="text-xl font-semibold mb-2 text-emerald-600">
                    Unsubscribe
                  </h3>
                  <button
                    onClick={handleUnsubscribe}
                    disabled={unsubscribeMutation.isPending}
                    className={`w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors ${
                      unsubscribeMutation.isPending
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {unsubscribeMutation.isPending
                      ? "Unsubscribing..."
                      : "Unsubscribe"}
                  </button>
                </div>
              </div>
            ) : (
              <p>You are not subscribed to any plan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
