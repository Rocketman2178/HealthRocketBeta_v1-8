import React, { useState } from 'react';
import { User, X, Loader2, Check, Smartphone, Shield } from 'lucide-react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { supabase } from '../../lib/supabase';

interface VitalSetupProps {
  onComplete: () => void;
  onClose: () => void;
}

export function VitalSetup({ onComplete, onClose }: VitalSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'intro' | 'setup' | 'success'>('intro');
  const { user } = useSupabase();

  const checkExistingVitalUser = async () => {
    if (!user) return null;
    
    try {
      // Get current vital user details
      const { data: vitalData, error: vitalError } = await supabase
        .rpc('get_vital_user', {
          p_user_id: user.id
        });

      if (vitalError) throw vitalError;
      
      // If user has vital_user_id, return it
      if (vitalData?.vital_user_id) {
        return vitalData.vital_user_id;
      }

      // Try to sync vital user
      const { data: syncData, error: syncError } = await supabase
        .rpc('sync_vital_user', {
          p_user_id: user.id
        });

      if (syncError) throw syncError;
    
      return syncData?.vital_user_id;
    } catch (err) {
      console.error('Error checking Vital user:', err);
      return null;
    }
  };

  const handleSetup = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      setStep('setup');
      
      // Check if user already has a Vital ID
      const existingVitalId = await checkExistingVitalUser();
      
      if (existingVitalId) {
        // User already has Vital setup, proceed to success
        setSuccess(true);
        setStep('success');
        setTimeout(() => {
          onComplete();
        }, 1500);
        return;
      }
      
      // Get session token for API call
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');
      
      try {
        // Only call create-vital-user if no existing ID
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-vital-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
            },
            body: JSON.stringify({ user_id: user.id })
          }
        );

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to setup health tracking');
        }

        setSuccess(true);
        setStep('success');
        setTimeout(() => {
          onComplete();
        }, 1500);
      } catch (err) {
        throw err;
      }

    } catch (err) {
      console.error('Error setting up health tracking:', err);
      setError(err instanceof Error ? err.message : 'Failed to setup health tracking');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'intro':
        return (
          <>
            <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
              <p className="text-gray-300">
                Connect your health devices and apps to automatically track your progress. This allows you to:
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

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="text-orange-500" size={20} />
                  <h4 className="text-sm font-medium text-white">Supported Devices</h4>
                </div>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>• Oura Ring</li>
                  <li>• Fitbit</li>
                  <li>• Apple Health</li>
                  <li>• Garmin</li>
                </ul>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="text-orange-500" size={20} />
                  <h4 className="text-sm font-medium text-white">Data Security</h4>
                </div>
                <p className="text-sm text-gray-300">
                  Your health data is encrypted and only accessible by you
                </p>
              </div>
            </div>
          </>
        );
      
      case 'setup':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-gray-300">Setting up health tracking...</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 bg-lime-500/20 rounded-full flex items-center justify-center mb-4">
              <Check className="text-lime-500" size={24} />
            </div>
            <p className="text-gray-300 mb-2">Setup complete!</p>
            <p className="text-sm text-gray-400">You can now connect your devices</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="text-orange-500" size={24} />
          <h3 className="text-lg font-semibold text-white">Setup Data Tracking</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-300"
        >
          <X size={20} />
        </button>
      </div>

      {renderStep()}

      {error && (
        <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        {step === 'intro' && (
          <button
            onClick={handleSetup}
            className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Setup Health Tracking
          </button>
        )}
      </div>
    </div>
  );
}