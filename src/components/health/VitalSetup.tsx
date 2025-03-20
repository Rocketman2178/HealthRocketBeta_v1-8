import { useEffect, useState } from "react";
import { User, X, Loader2, Check, Smartphone, Shield } from "lucide-react";
import { useSupabase } from "../../contexts/SupabaseContext";
import { supabase } from "../../lib/supabase";
import LoadingSpinner from "../common/LoadingSpinner";

import { useNavigate } from "react-router-dom";
import { supportedProviders } from "../../constants";


interface VitalSetupProps {
  onComplete: () => void;
  onClose: () => void;
}

export function VitalSetup({ onComplete, onClose }: VitalSetupProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [getVitalUserLoading, setGetVitalUserLoading] = useState(false);
  const [currentVitalUserId, setCurrentVitalUserId] = useState(null);
  const [step, setStep] = useState<"intro" | "setup" | "success">("intro");
  const { user, session: access_token } = useSupabase();

  // CHECK EXISTING VITAL USER
  const checkExistingVitalUser = async () => {
    if (!user) return null;

    try {
      setGetVitalUserLoading(true);
      // Get current vital user details
      const { data: vitalData, error: vitalError } = await supabase.rpc(
        "get_vital_user",
        {
          p_user_id: user.id,
        }
      );

      if (vitalError) throw vitalError;

      // If user has vital_user_id, return it
      if (vitalData?.vital_user_id) {
        setCurrentVitalUserId(vitalData?.vital_user_id);
      }

      // Try to sync vital user
      const { error: syncError } = await supabase.rpc("sync_vital_user", {
        p_user_id: user.id,
      });

      if (syncError) throw syncError;
    } catch (err) {
      setCurrentVitalUserId(null);
    } finally {
      setGetVitalUserLoading(false);
    }
  };

  useEffect(() => {
    checkExistingVitalUser();
  }, [user?.id]);

  // HANDLE SETUP
  const handleSetup = async () => {
    if (!user) return;

    try {
      setError(null);
      setStep("setup");
      try {
        // Only call create-vital-user if no existing ID
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-vital-user`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ user_id: user.id }),
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to setup health tracking");
        }
        setStep("success");
        setTimeout(() => {
          onComplete();
        }, 1500);
      } catch (err) {
        throw err;
      }
    } catch (err) {
      console.error("Error setting up health tracking:", err);
      setError(
        err instanceof Error ? err.message : "Failed to setup health tracking"
      );
    } finally {
    }
  };
  const handleNext = () => {
    navigate("/connect-device");
  };
  

  if (getVitalUserLoading) return <LoadingSpinner />;

  //
  const handleGotoConnectDevices = () => {
    onComplete();
  };

  const renderStep = () => {
    switch (step) {
      case "intro":
        return (
          <div className="flex flex-col justify-center gap-2">
            <div className="rounded-lg p-4 space-y-4 bg-gray-700/50">
              <p className="text-gray-300 text-lg font-bold">
                Connect your health devices and apps to automatically track your
                progress. This allows you to:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-gray-300">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Connect health tracking devices and apps</span>
                </li>
                <li className="flex items-start gap-2 text-gray-300">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Sync sleep, activity, and other health metrics</span>
                </li>
                <li className="flex items-start gap-2 text-gray-300">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Track your progress over time</span>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 md:px-4 ">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="text-orange-500" size={20} />
                    <h4 className="text-lg font-medium text-white">
                      Supported Devices
                    </h4>
                  </div>
                </div>

                <ul className="space-y-1  flex flex-col gap-2 text-gray-300">
                  {supportedProviders?.map((provider) => (
                    <div className="flex justify-between items-center px-2 ">
                      <div className="flex gap-2 items-center ">
                        <img
                          src={provider?.logo}
                          className="object-cover w-10 h-10 rounded-full"
                        />{" "}
                        <span>{provider.name}</span>
                      </div>
                    
                    </div>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4 bg-gray-700/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="text-orange-500" size={20} />
                  <h4 className="text-sm font-medium text-white">
                    Data Security
                  </h4>
                </div>
                <p className="text-s text-gray-300">
                  Your health data is encrypted and only accessible by you
                </p>
              </div>
            </div>
          </div>
        );

      case "setup":
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-300">Setting up health tracking...</p>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center mb-4">
              <Check className="text-lime-500" size={24} />
            </div>
            <p className="text-gray-300 mb-2">Setup complete!</p>
            <p className="text-sm text-gray-400">
              You can now connect your devices
            </p>
          </div>
        );
    }
  };

  if (getVitalUserLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <User className="text-orange-500" size={24} />
          <h3 className="text-lg font-semibold text-white">
            {currentVitalUserId
              ? "Connect Devices To Your Vital Account"
              : " Setup Data Tracking"}
          </h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-300">
          <X size={20} />
        </button>
      </div>

      {renderStep()}

      {error && (
        <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-s">
          {error}
        </div>
      )}

      <div className="flex justify-end items-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        {step === "intro" && !currentVitalUserId && (
          <button
            onClick={handleSetup}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Setup Health Tracking
          </button>
        )}
        {currentVitalUserId && (
          <button
            onClick={handleNext}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go To Connect Devices
          </button>
        )}
      </div>
    </div>
  );
}
