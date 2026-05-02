import React, { useState } from 'react';
import { apiClient } from '../../../api/client';
import { useConfiguration } from '../hooks/useConfiguration';
import { useStackActions } from '../hooks/useStackActions';
import { useConfigurationFlags } from '../hooks/useConfigurationFlags';

// Components
import { MapboxConfig } from './config/MapboxConfig';
import { AWSConfig } from './config/AWSConfig';
import { GeocodingConfig } from './config/GeocodingConfig';
import { GoogleMapsConfig } from './config/GoogleMapsConfig';
import { HomeLocationConfig } from './config/HomeLocationConfig';
import { WigleConfig } from './config/WigleConfig';
import { SmartyConfig } from './config/SmartyConfig';

// Extracted Sub-components
import { ConfigSectionHeader } from './config/ConfigSectionHeader';
import { StackActionsConfig } from './config/StackActionsConfig';
import { RuntimeStatusConfig } from './config/RuntimeStatusConfig';
import { ScoringControlsConfig } from './config/ScoringControlsConfig';
import { DeployFlagsConfig } from './config/DeployFlagsConfig';
import { ConfigMutabilityCard } from './config/ConfigMutabilityCard';

export const ConfigurationTab: React.FC = () => {
  const config = useConfiguration();
  const { stackActionLoading, stackActionMessage, runLocalStackAction } = useStackActions();
  const [deployFlagsOpen, setDeployFlagsOpen] = React.useState(false);
  const [reloading, setReloading] = useState(false);
  const [reloadMsg, setReloadMsg] = useState<string | null>(null);

  const reloadSecrets = async () => {
    setReloading(true);
    setReloadMsg(null);
    try {
      const result = await apiClient.post<{
        ok: boolean;
        smReachable: boolean;
        smLastError: string | null;
      }>('/settings/reload-secrets', {});
      setReloadMsg(
        result.smReachable
          ? '✓ Secrets reloaded from AWS SM'
          : `⚠ SM unreachable: ${result.smLastError}`
      );
    } catch (e: any) {
      setReloadMsg(`✗ ${e.message}`);
    } finally {
      setReloading(false);
    }
  };

  const demoMode = String(import.meta.env.VITE_DEMO_MODE || '').toLowerCase() === 'true';
  const { operationalFlags, deployFlags } = useConfigurationFlags({
    featureFlags: config.runtimeConfig?.featureFlags,
    demoMode,
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ConfigMutabilityCard
          operationalFlags={operationalFlags}
          isLoading={config.isLoading}
          onToggle={config.updateFeatureFlag}
        />
        <StackActionsConfig
          stackActionLoading={stackActionLoading}
          stackActionMessage={stackActionMessage}
          runLocalStackAction={runLocalStackAction}
        />
        <RuntimeStatusConfig runtime={config.runtimeConfig?.runtime} />
      </div>

      <div>
        <ConfigSectionHeader
          title="Scoring Controls"
          description="Disable ML Training + ML Scoring and enable Simple Rule Scoring for pure rule mode."
        />
        <ScoringControlsConfig
          featureFlags={config.runtimeConfig?.featureFlags}
          isLoading={config.isLoading}
          updateFeatureFlag={config.updateFeatureFlag}
        />
      </div>

      <div>
        <ConfigSectionHeader title="Location & Mapping" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <HomeLocationConfig
            lat={config.homeLocation.lat}
            lng={config.homeLocation.lng}
            radius={config.homeLocation.radius}
            setHomeLocation={config.setHomeLocation}
            isSaving={config.isLoading}
            onSave={config.saveHomeLocation}
            hasChanges={
              config.homeLocation.lat !== config.savedValues.homeLocation.lat ||
              config.homeLocation.lng !== config.savedValues.homeLocation.lng ||
              config.homeLocation.radius !== config.savedValues.homeLocation.radius
            }
            isLoading={config.isLoading}
            isConfigured={config.homeLocationConfigured}
          />
          <MapboxConfig
            mapboxToken={config.mapboxToken}
            setMapboxToken={config.setMapboxToken}
            savedMapboxToken={config.savedValues.mapboxToken}
            mapboxUnlimitedApiKey={config.mapboxUnlimitedApiKey}
            setMapboxUnlimitedApiKey={config.setMapboxUnlimitedApiKey}
            savedMapboxUnlimitedApiKey={config.savedValues.mapboxUnlimitedApiKey}
            isSaving={config.isLoading}
            onSave={config.saveMapboxToken}
            hasChanges={
              config.mapboxToken !== config.savedValues.mapboxToken ||
              config.mapboxUnlimitedApiKey !== config.savedValues.mapboxUnlimitedApiKey
            }
            isConfigured={config.mapboxConfigured || config.mapboxUnlimitedConfigured}
          />
          <WigleConfig
            wigleApiName={config.wigleApiName}
            setWigleApiName={config.setWigleApiName}
            savedWigleApiName={config.savedValues.wigleApiName}
            wigleApiToken={config.wigleApiToken}
            setWigleApiToken={config.setWigleApiToken}
            savedWigleApiToken={config.savedValues.wigleApiToken}
            isSaving={config.isLoading}
            onSave={config.saveWigleCredentials}
            isConfigured={config.wigleConfigured}
          />
        </div>
      </div>

      <div>
        <ConfigSectionHeader title="API Credentials" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AWSConfig
            awsRegion={config.awsRegion}
            setAwsRegion={config.setAwsRegion}
            savedAwsRegion={config.savedValues.awsRegion}
            awsAccessKeyId=""
            setAwsAccessKeyId={() => {}}
            savedAwsAccessKeyId=""
            awsSecretAccessKey=""
            setAwsSecretAccessKey={() => {}}
            savedAwsSecretAccessKey=""
            isSaving={config.isLoading}
            onSave={config.saveAwsRegion}
            hasChanges={config.awsRegion !== config.savedValues.awsRegion}
            isConfigured={config.awsConfigured}
          />
          <GeocodingConfig
            opencageApiKey={config.opencageApiKey}
            setOpencageApiKey={config.setOpencageApiKey}
            savedOpencageApiKey={config.savedValues.opencageApiKey}
            geocodioApiKey={config.geocodioApiKey}
            setGeocodioApiKey={config.setGeocodioApiKey}
            savedGeocodioApiKey={config.savedValues.geocodioApiKey}
            locationIqApiKey={config.locationIqApiKey}
            setLocationIqApiKey={config.setLocationIqApiKey}
            savedLocationIqApiKey={config.savedValues.locationIqApiKey}
            isSaving={config.isLoading}
            onSave={() => {
              if (config.opencageApiKey !== config.savedValues.opencageApiKey)
                config.saveOpencageApiKey();
              if (config.geocodioApiKey !== config.savedValues.geocodioApiKey)
                config.saveGeocodioApiKey();
              if (config.locationIqApiKey !== config.savedValues.locationIqApiKey)
                config.saveLocationIqApiKey();
            }}
            hasChanges={
              config.opencageApiKey !== config.savedValues.opencageApiKey ||
              config.geocodioApiKey !== config.savedValues.geocodioApiKey ||
              config.locationIqApiKey !== config.savedValues.locationIqApiKey
            }
            isConfigured={
              config.opencageConfigured || config.geocodioConfigured || config.locationIqConfigured
            }
          />
          <GoogleMapsConfig
            googleMapsApiKey={config.googleMapsApiKey}
            setGoogleMapsApiKey={config.setGoogleMapsApiKey}
            savedGoogleMapsApiKey={config.savedValues.googleMapsApiKey}
            isSaving={config.isLoading}
            onSave={config.saveGoogleMapsApiKey}
            hasChanges={config.googleMapsApiKey !== config.savedValues.googleMapsApiKey}
            isConfigured={config.googleMapsConfigured}
          />
          <SmartyConfig
            smartyAuthId={config.smartyAuthId}
            setSmartyAuthId={config.setSmartyAuthId}
            savedSmartyAuthId={config.savedValues.smartyAuthId}
            smartyAuthToken={config.smartyAuthToken}
            setSmartyAuthToken={config.setSmartyAuthToken}
            savedSmartyAuthToken={config.savedValues.smartyAuthToken}
            isSaving={config.isLoading}
            onSave={config.saveSmartyCredentials}
            isConfigured={config.smartyConfigured}
          />
        </div>
      </div>

      <DeployFlagsConfig
        deployFlags={deployFlags}
        isLoading={config.isLoading}
        updateFeatureFlag={config.updateFeatureFlag}
        isOpen={deployFlagsOpen}
        onToggle={() => setDeployFlagsOpen((o) => !o)}
      />

      {/* Reload Secrets — force fresh SM load without container restart */}
      <div className="mt-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-lg flex items-center gap-4">
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-200">Reload Secrets from AWS SM</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Forces the server to re-fetch all credentials from Secrets Manager without a container
            restart. Use this after saving API keys if they aren't taking effect.
          </div>
          {reloadMsg && (
            <div
              className={`text-xs mt-1 font-mono ${reloadMsg.startsWith('✓') ? 'text-green-400' : 'text-amber-400'}`}
            >
              {reloadMsg}
            </div>
          )}
        </div>
        <button
          onClick={reloadSecrets}
          disabled={reloading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
        >
          {reloading ? 'Reloading…' : 'Reload Secrets'}
        </button>
      </div>
    </div>
  );
};

export default ConfigurationTab;
