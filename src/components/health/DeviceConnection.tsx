import React, { useState } from 'react';
import { Smartphone, Check, X, Loader2 } from 'lucide-react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { supabase } from '../../lib/supabase/client';

interface DeviceConnectionProps {
  onClose: () => void;
}

const PROVIDERS = [
  { id: 'oura', name: 'Oura Ring', icon: '💍' },
  { id: 'fitbit', name: 'Fitbit', icon: '⌚' },
  { id: 'apple', name: 'Apple Health', icon: '🍎' },
  { id: 'garmin', name: 'Garmin', icon: '📱' }
];

export function DeviceConnection({ onClose }: DeviceConnectionProps) {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [deviceEmail, setDeviceEmail] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useSupabase();

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setShowEmailInput(true);
    setError(null);
  };

  const handleConnect = async () => {
    if (!user?.id) return;
    
    setError(null);
    
    try {
      setLoading(true);

      if (!deviceEmail.trim()) {
        throw new Error('Please enter your device account email');
      }

      // Get user's vital_user_id
      const { data: vitalData, error: vitalError } = await supabase
        .rpc('get_vital_user', {
          p_user_id: user.id
        });

      if (vitalError) throw vitalError;
      if (!vitalData?.vital_user_id) {
        throw new Error('Please complete health tracking setup first');
      }

      // Get link token
      const { data: linkData, error: linkError } = await supabase
        .rpc('get_vital_link_token', {
          p_user_id: user.id,
          p_provider: selectedProvider,
          p_device_email: deviceEmail
        });

      if (linkError) throw linkError;
      if (!linkData?.success) {
        throw new Error('Failed to get connection link');
      }

      // Call edge function to get connection URL
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-vital-device`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: JSON.stringify({ 
            user_id: user.id,
            provider: selectedProvider,
            device_email: deviceEmail
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || 'Failed to connect device';
        } catch (e) {
          errorMessage = errorText || response.statusText || 'Failed to connect device';
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to connect device');
      }

      // Check for link token in response
      const linkToken = data?.link?.linkToken || data?.linkToken;
      
      if (linkToken) {
        // Open Vital link in new window
        const width = 600;
        const height = 800;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;
        
        window.open(
          `https://link.tryvital.io/?token=${linkToken}`,
          'VitalLink',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
        );

        // Close device connection modal
        onClose();
      } else {
        console.error('No link token in response:', data);
        throw new Error('Failed to get connection link. Please try again.');
      }

    } catch (err) {
      console.error('Error connecting device:', err, err.stack);
      let message = err instanceof Error ? err.message : 'Failed to connect device. Please try again.';
      
      // Handle specific error cases
      if (message.includes('health tracking setup')) {
        message = 'Please complete health tracking setup before connecting a device';
      } else if (message.includes('Invalid provider')) {
        message = 'Invalid device provider selected';
      } else if (message.includes('Vital user ID not found')) {
        message = 'Please complete health tracking setup first';
      }
      
      setError(message);
      setSelectedProvider(null); // Reset selected provider on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Smartphone className="text-orange-500" size={24} />
          <h3 className="text-lg font-semibold text-white">Connect Health Device</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300"
        >
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
          <X size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {PROVIDERS.map(provider => (
          <button
            key={provider.id}
            onClick={() => handleProviderSelect(provider.id)}
            disabled={loading && selectedProvider === provider.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
              loading && selectedProvider === provider.id
                ? 'bg-gray-700 cursor-wait'
                : 'bg-gray-700/50 hover:bg-gray-700'
            }`}
          >
            <div className="text-2xl">{provider.icon}</div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-white">{provider.name}</div>
              {loading && selectedProvider === provider.id ? (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                <div className="text-xs text-gray-400">Click to connect</div>
              )}
            </div>
          </button>
        ))}
      </div>

      {showEmailInput && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter your {PROVIDERS.find(p => p.id === selectedProvider)?.name} Account Email
            </label>
            <input
              type="email"
              value={deviceEmail}
              onChange={(e) => setDeviceEmail(e.target.value)}
              placeholder="device@example.com"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="mt-2 text-xs text-gray-400">
              This should be the email associated with your device account
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowEmailInput(false);
                setSelectedProvider(null);
                setDeviceEmail('');
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
              {loading ? 'Connecting...' : 'Connect Device'}
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-center text-gray-400 mt-4">
        Your data is securely synced and only accessible by you
      </div>
    </div>
  );
}