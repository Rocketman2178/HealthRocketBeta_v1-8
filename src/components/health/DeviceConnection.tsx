import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Smartphone, X, Loader2, Search } from "lucide-react";
import { useSupabase } from "../../contexts/SupabaseContext";
import { supabase } from "../../lib/supabase/client";
import LoadingSpinner from "../common/LoadingSpinner";
import { useSearchParams } from "react-router-dom";
import { useVitalLink } from "@tryvital/vital-link";
type ProviderType = {
  authType: string;
  description: string;
  logo: string;
  name: string;
  slug: string;
  supportedResources: string[];
};
const featuredProviders = [
  "Oura",
  "Garmin",
  "Whoop V2",
  "Strava",
  "Peloton",
  "Eight Sleep",
  "MyFitnessPal",
  "Fitbit",
];

export function DeviceConnection() {
  const [searchParams] = useSearchParams();

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [deviceEmail, setDeviceEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showDisConnectedMessage, setShowDisconnectMessage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingProvidersLoading, setFetchingProvidersLoading] =
    useState(false);
  const [disConnectLoading, setDisconnectLoading] = useState(false);
  const [
    fetchingConnectedProvidersLoading,
    setfetchingConnectedProvidersLoading,
  ] = useState(false);
  const [errorMessage, setError] = useState<string | null>(null);
  const { user, session: access_token } = useSupabase();
  const [providers, setProviders] = useState<ProviderType[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<ProviderType[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const emailInputRef = useRef<HTMLDivElement>(null);

  // HANDLE PROVIDER SELECT
  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setShowEmailInput(true);
    setShowDisconnectMessage(false);
    setError(null);
  };

  // HANDLE PROVIDER DISELECT
  const handleProvderDiselect = (providerId: string) => {
    setSelectedProvider(providerId);
    setShowEmailInput(false);
    setShowDisconnectMessage(true);
    setError(null);
  };

  // HANDLE ERROR REMOVE
  const handleErrorRemove = () => {
    setError("");
    setConnectionMessage("");
  };

  // GET ALL PROVIDERS
  useEffect(() => {
    const getAllProviders = async () => {
      setFetchingProvidersLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-providers`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setProviders(data?.providers || []);
      } catch (error) {
        console.error("Error fetching providers:", error);
      } finally {
        setFetchingProvidersLoading(false);
      }
    };

    getAllProviders();
  }, []);

  // GET CONNECTED USER PROVIDERS
  const getConnectedProviders = async () => {
    if (!user?.id) return;
    try {
      setfetchingConnectedProvidersLoading(true);
      const { data: userData, error } = await supabase
        .from("users")
        .select("vital_user_id")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      const response = await fetch(
        `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/get-connected-providers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userData.vital_user_id,
          }),
        }
      );
      const data = await response.json();
      setConnectedProviders(data?.connectedProviders || []);
    } catch (error) {
    } finally {
      setfetchingConnectedProvidersLoading(false);
    }
  };
  useEffect(() => {
    getConnectedProviders();
  }, [user?.id]);

  // SCROLL TO EMAIL INPUT
  useEffect(() => {
    if (selectedProvider && emailInputRef.current) {
      emailInputRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedProvider]);
  useEffect(() => {
    const processStatus = async () => {
      setLoading(true);

      const stateParam = searchParams.get("state");
      const providerParam = searchParams.get("provider");

      if (stateParam === "success" && providerParam) {
        try {
          // Update status to "active"
          const { error } = await supabase
            .from("user_devices")
            .update({ status: "active" })
            .eq("user_id", user?.id)
            .eq("provider", providerParam);

          if (error) throw error;
          getConnectedProviders();
          setConnectionMessage("Device successfully linked!");
        } catch (error) {
          setConnectionMessage(
            "An error occurred while updating your device status."
          );
        }
      } else {
        setConnectionMessage("Invalid request or missing parameters.");
      }

      setLoading(false);
    };

    processStatus();
  }, [searchParams, user?.id]);
  const onSuccess = useCallback((metadata:any) => {
    // Device is now connected.
    console.log("onSuccess", metadata);
  }, []);

  const onExit = useCallback((metadata:any) => {
    // User has quit the link flow.
    console.log("onExit", metadata);
  }, []);

  const onError = useCallback((metadata:any) => {
    // Error encountered in connecting device.
    console.log("onError", metadata);
  }, []);

  const config = {
    onSuccess,
    onExit,
    onError,
    env: "sandbox",
    region: "us",
  };

  const { open, ready, error } = useVitalLink(config);

  const handleVitalOpen = async (token:string) => {
    open(token);
  };
const embedableProviders:string[] = [
  "zwift",
  "ultrahuman",
  "renpho",
  "omron",
  "kardia",
  "hammerhead",
  "freestyle_libre",
  "dexcom",
  "beurer_api",
  "abbott_libreview",
  "strava",
  "peloton",
  "eight_sleep"
];
  // HANDLE CONNECT
  const handleConnect = async () => {
    if (!user?.id) return;

    setError(null);

    try {
      setLoading(true);

      if (!deviceEmail.trim()) {
        throw new Error("Please enter your device account email");
      }

      // Get user's vital_user_id
      const { data: vitalData, error: vitalError } = await supabase.rpc(
        "get_vital_user",
        {
          p_user_id: user.id,
        }
      );

      if (vitalError) throw vitalError;
      if (!vitalData?.vital_user_id) {
        throw new Error("Please complete health tracking setup first");
      }

      // Get link token
      const { data: linkData, error: linkError } = await supabase.rpc(
        "get_vital_link_token",
        {
          p_user_id: user.id,
          p_provider: selectedProvider,
          p_device_email: deviceEmail,
        }
      );

      if (linkError) throw linkError;
      if (!linkData?.success) {
        throw new Error("Failed to get connection link");
      }

      // Call edge function to get connection URL
      const response = await fetch(
        `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/connect-vital-device`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            user_id: user.id,
            provider: selectedProvider,
            device_email: deviceEmail,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || "Failed to connect device";
        } catch (e) {
          errorMessage =
            errorText || response.statusText || "Failed to connect device";
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to connect device");
      }

      // FIND THE LINK WEB URL
      const linkWebUrl = data?.link?.linkWebUrl;
      const linkToken = data?.link.linkToken;
      const isProviderIframeEmbedable = embedableProviders.some((provider:string)=>provider===selectedProvider);
      // CHECK IF THE LINK WEB URL EXISTS
      if (linkToken && isProviderIframeEmbedable) {
        handleVitalOpen(linkToken);
      }else{
        window.open(linkWebUrl,"_blank");
      }
    } catch (err) {
      console.error("Error connecting device:", err, err.stack);
      let message =
        err instanceof Error
          ? err.message
          : "Failed to connect device. Please try again.";

      // Handle specific error cases
      if (message.includes("health tracking setup")) {
        message =
          "Please complete health tracking setup before connecting a device";
      } else if (message.includes("Invalid provider")) {
        message = "Invalid device provider selected";
      } else if (message.includes("Vital user ID not found")) {
        message = "Please complete health tracking setup first";
      }

      setError(message);
      setSelectedProvider(null); // Reset selected provider on error
    } finally {
      setLoading(false);
    }
  };

  // HANDLE PROVIDER DISCONNECT
  const handleDisconnect = async () => {
    try {
      setDisconnectLoading(true);
      const { data: userData, error } = await supabase
        .from("users")
        .select("vital_user_id")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      const response = await fetch(
        `${
          import.meta.env.VITE_SUPABASE_URL
        }/functions/v1/deregister-connection`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            vital_user_id: userData?.vital_user_id,
            user_id: user?.id,
            provider: selectedProvider,
          }),
        }
      );
      const data = await response.json();
      if (data?.success) {
        getConnectedProviders();
      }
    } catch (error) {
    } finally {
      setDisconnectLoading(false);
    }
  };

  // SORT PROVIDERS: FEATURED FIRST, THEN ALPHABETICAL
  const sortedProviders = useMemo(() => {
    const featured: ProviderType[] = [];
    const others: ProviderType[] = [];

    providers.forEach((provider) => {
      if (provider.authType !== "sdk") {
        if (featuredProviders.includes(provider.name)) {
          featured.push(provider);
        } else {
          others.push(provider);
        }
      }
    });
    featured.sort((a, b) => a.name.localeCompare(b.name));
    others.sort((a, b) => a.name.localeCompare(b.name));
    return [...featured, ...others];
  }, [providers]);

  // FILTER PROVIDERS BASED ON SEARCH TERM
  const filteredProviders = useMemo(() => {
    return sortedProviders.filter((provider: ProviderType) =>
      provider.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, sortedProviders]);

  // LOADING SPINNER
  if (fetchingProvidersLoading || fetchingConnectedProvidersLoading)
    return <LoadingSpinner />;

  return (
    <div className="relative fixed inset-0 flex items-center justify-center ">
      <div className="relative  px-2 rounded-lg shadow-lg w-full  ">
        <div className="flex items-center md:justify-between gap-2 px-2 mb-6 sticky top-0 bg-gray-800 z-10 py-6 ">
          <div className="flex items-center gap-2">
            <Smartphone className="text-orange-500" size={24} />
            <h3 className="text-lg font-semibold text-white">
              Connect Health Device
            </h3>
          </div>

          {/* Search Bar */}
          <div className="relative ">
            <Search
              className="absolute left-3 top-2.5 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search provider..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

          </div>
        </div>
        <div className="overflow-y-auto md:px-20  ">
          <div className="grid grid-cols-1  md:grid-cols-4 gap-4 ">
            {filteredProviders?.map((provider: ProviderType) => {
              const isConnected = connectedProviders.some(
                (connectedProvider) => connectedProvider.slug === provider.slug
              );
              return (
                <div
                  key={provider.slug}
                  onClick={
                    isConnected
                      ? () => handleProvderDiselect(provider?.slug)
                      : () => handleProviderSelect(provider.slug)
                  }
                  className={`flex items-center cursor-pointer gap-3 p-3 rounded-lg border-2 border-gray-600  bg-gray-800 transition-colors${
                    loading && selectedProvider === provider.slug
                      ? "bg-gray-700 cursor-wait"
                      : "bg-gray-700/50 hover:bg-gray-700"
                  }`}
                >
                  <img
                    src={provider?.logo}
                    className="text-2xl object-cover w-12 h-12 rounded-full"
                  />
                  <div className="flex-1 text-left">
                    <div className="text-lg font-medium text-white">
                      {provider.name}
                    </div>
                    <div className="text-gray-400">
                      {provider.description || "No description available"}
                    </div>

                    {loading && selectedProvider === provider.slug ? (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Loader2 size={12} className="animate-spin" />
                        <span>
                          {isConnected ? "Disconnecting..." : "Connecting..."}
                        </span>
                      </div>
                    ) : (
                      <div className="text-gray-400 flex flex-col">
                        {isConnected && (
                          <span className="text-green-500">Connected</span>
                        )}

                        <span>
                          {isConnected
                            ? "Click To Disconnect"
                            : "Click To Connect"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="mt-6 space-y-4 bg-gray-800 flex flex-col justify-center items-center "
          ref={emailInputRef}
        >
          {showDisConnectedMessage && (
            <div className="flex justify-between">
              <span className="text-yellow-500">
                You Are Disconnecting Device{" "}
                {connectedProviders?.find(
                  (provider) => provider?.slug === selectedProvider
                )?.name || ""}
              </span>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {disConnectLoading ? "Disconnecting..." : "Disconnect Device"}
              </button>
            </div>
          )}
          {showEmailInput && (
            <div className="flex flex-col gap-4 md:w-1/2 w-full p-2">
              <div className="flex flex-col gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Enter your{" "}
                    <span className="text-orange-500 text-lg">
                      {providers.find((p) => p.slug === selectedProvider)?.name}{" "}
                    </span>
                    Account Email
                  </label>
                  <input
                    type="email"
                    value={deviceEmail}
                    onChange={(e) => setDeviceEmail(e.target.value)}
                    placeholder="device@example.com"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <p className="mt-2 text-s text-gray-400">
                  This should be the email associated with your device account
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowEmailInput(false);
                    setSelectedProvider(null);
                    setDeviceEmail("");
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConnect}
                  disabled={loading || !deviceEmail.trim()}
                  className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "Connecting..." : "Connect Device"}
                </button>
              </div>
            </div>
          )}
          {connectionMessage ? (
            <div>
              <div className="bg-green-500/10 text-white p-3 rounded-lg text-sm flex items-start gap-2">
                  <X
                    size={16}
                    className="shrink-0 mt-0.5"
                    onClick={handleErrorRemove}
                  />
                  <span>{connectionMessage}</span>
                </div>
            </div>
          ) : (
            <div>
              {errorMessage && (
                <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                  <X
                    size={16}
                    className="shrink-0 mt-0.5"
                    onClick={handleErrorRemove}
                  />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}
          <div className="text-s py-2 text-center text-gray-400 mt-4  ">
            Your data is securely synced and only accessible by you
          </div>
        </div>

      </div>
    </div>
  );
}
