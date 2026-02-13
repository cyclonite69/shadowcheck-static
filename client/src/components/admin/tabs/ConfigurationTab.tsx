import React from 'react';
import { useConfiguration } from '../hooks/useConfiguration';
import { ApiKeyCard } from '../components/ApiKeyCard';
import { HomeLocationCard } from '../components/HomeLocationCard';

const DatabaseIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
  </svg>
);

const ShieldIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" />
  </svg>
);

export const ConfigurationTab: React.FC = () => {
  const {
    isLoading,
    mapboxToken,
    setMapboxToken,
    mapboxConfigured,
    saveMapboxToken,
    mapboxUnlimitedApiKey,
    setMapboxUnlimitedApiKey,
    mapboxUnlimitedConfigured,
    saveMapboxUnlimitedApiKey,
    googleMapsApiKey,
    setGoogleMapsApiKey,
    googleMapsConfigured,
    saveGoogleMapsApiKey,
    awsAccessKeyId,
    setAwsAccessKeyId,
    awsSecretAccessKey,
    setAwsSecretAccessKey,
    awsSessionToken,
    setAwsSessionToken,
    awsRegion,
    setAwsRegion,
    awsConfigured,
    saveAwsCredentials,
    opencageApiKey,
    setOpencageApiKey,
    opencageConfigured,
    saveOpencageApiKey,
    locationIqApiKey,
    setLocationIqApiKey,
    locationIqConfigured,
    saveLocationIqApiKey,
    smartyAuthId,
    setSmartyAuthId,
    smartyAuthToken,
    setSmartyAuthToken,
    smartyConfigured,
    saveSmartyCredentials,
    wigleApiName,
    setWigleApiName,
    wigleApiToken,
    setWigleApiToken,
    wigleConfigured,
    saveWigleCredentials,
    homeLocation,
    setHomeLocation,
    saveHomeLocation,
  } = useConfiguration();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ApiKeyCard
        icon={DatabaseIcon}
        title="Mapbox Configuration"
        color="from-blue-500 to-blue-600"
        ringColor="focus:ring-blue-500/40"
        buttonGradient="from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
        fields={[
          {
            label: 'API Token',
            value: mapboxToken,
            onChange: setMapboxToken,
            placeholder: 'pk.eyJ1...',
          },
        ]}
        isConfigured={mapboxConfigured}
        onSave={saveMapboxToken}
        isLoading={isLoading}
        saveLabel="Save Token"
      />

      <ApiKeyCard
        icon={DatabaseIcon}
        title="Mapbox Geocoding Key"
        color="from-sky-500 to-sky-600"
        ringColor="focus:ring-sky-500/40"
        buttonGradient="from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600"
        fields={[
          {
            label: 'API Key',
            value: mapboxUnlimitedApiKey,
            onChange: setMapboxUnlimitedApiKey,
            placeholder: 'sk.',
            type: 'password' as const,
          },
        ]}
        isConfigured={mapboxUnlimitedConfigured}
        onSave={saveMapboxUnlimitedApiKey}
        isLoading={isLoading}
        saveLabel="Save Geocoding Key"
      />

      <ApiKeyCard
        icon={DatabaseIcon}
        title="Google Maps Configuration"
        color="from-emerald-500 to-emerald-600"
        ringColor="focus:ring-emerald-500/40"
        buttonGradient="from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600"
        fields={[
          {
            label: 'API Key',
            value: googleMapsApiKey,
            onChange: setGoogleMapsApiKey,
            placeholder: 'AIzaSy...',
          },
        ]}
        isConfigured={googleMapsConfigured}
        onSave={saveGoogleMapsApiKey}
        isLoading={isLoading}
        saveLabel="Save API Key"
      />

      <ApiKeyCard
        icon={DatabaseIcon}
        title="AWS Configuration"
        color="from-cyan-500 to-cyan-600"
        ringColor="focus:ring-cyan-500/40"
        buttonGradient="from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600"
        fields={[
          {
            label: 'Access Key ID',
            value: awsAccessKeyId,
            onChange: setAwsAccessKeyId,
            placeholder: 'AKIA...',
          },
          {
            label: 'Secret Access Key',
            value: awsSecretAccessKey,
            onChange: setAwsSecretAccessKey,
            placeholder: 'secret',
            type: 'password' as const,
          },
          {
            label: 'Session Token (Optional)',
            value: awsSessionToken,
            onChange: setAwsSessionToken,
            placeholder: 'token',
            type: 'password' as const,
          },
          { label: 'Region', value: awsRegion, onChange: setAwsRegion, placeholder: 'us-east-1' },
        ]}
        isConfigured={awsConfigured}
        onSave={saveAwsCredentials}
        isLoading={isLoading}
        saveLabel="Save AWS Credentials"
      />

      <ApiKeyCard
        icon={DatabaseIcon}
        title="OpenCage Configuration"
        color="from-indigo-500 to-indigo-600"
        ringColor="focus:ring-indigo-500/40"
        buttonGradient="from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600"
        fields={[
          {
            label: 'API Key',
            value: opencageApiKey,
            onChange: setOpencageApiKey,
            placeholder: 'opencage...',
            type: 'password' as const,
          },
        ]}
        isConfigured={opencageConfigured}
        onSave={saveOpencageApiKey}
        isLoading={isLoading}
        saveLabel="Save API Key"
      />

      <ApiKeyCard
        icon={DatabaseIcon}
        title="LocationIQ Configuration"
        color="from-teal-500 to-teal-600"
        ringColor="focus:ring-teal-500/40"
        buttonGradient="from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600"
        fields={[
          {
            label: 'API Key',
            value: locationIqApiKey,
            onChange: setLocationIqApiKey,
            placeholder: 'locationiq...',
            type: 'password' as const,
          },
        ]}
        isConfigured={locationIqConfigured}
        onSave={saveLocationIqApiKey}
        isLoading={isLoading}
        saveLabel="Save API Key"
      />

      <ApiKeyCard
        icon={ShieldIcon}
        title="Smarty Configuration"
        color="from-rose-500 to-rose-600"
        ringColor="focus:ring-rose-500/40"
        buttonGradient="from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600"
        fields={[
          {
            label: 'Auth ID',
            value: smartyAuthId,
            onChange: setSmartyAuthId,
            placeholder: 'auth-id',
            type: 'password' as const,
          },
          {
            label: 'Auth Token',
            value: smartyAuthToken,
            onChange: setSmartyAuthToken,
            placeholder: 'auth-token',
            type: 'password' as const,
          },
        ]}
        isConfigured={smartyConfigured}
        onSave={saveSmartyCredentials}
        isLoading={isLoading}
        saveLabel="Save Credentials"
      />

      <ApiKeyCard
        icon={ShieldIcon}
        title="WiGLE Configuration"
        color="from-orange-500 to-orange-600"
        ringColor="focus:ring-orange-500/40"
        buttonGradient="from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600"
        fields={[
          {
            label: 'API Name',
            value: wigleApiName,
            onChange: setWigleApiName,
            placeholder: 'AIDc40fa13...',
          },
          {
            label: 'API Token',
            value: wigleApiToken,
            onChange: setWigleApiToken,
            placeholder: '32 character hex token',
            type: 'password' as const,
          },
        ]}
        isConfigured={wigleConfigured}
        onSave={saveWigleCredentials}
        isLoading={isLoading}
        saveLabel="Save Credentials"
      />

      <HomeLocationCard
        icon={ShieldIcon}
        homeLocation={homeLocation}
        setHomeLocation={setHomeLocation}
        onSave={saveHomeLocation}
        isLoading={isLoading}
      />
    </div>
  );
};
