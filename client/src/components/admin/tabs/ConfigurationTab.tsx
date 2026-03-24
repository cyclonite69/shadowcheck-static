import React from 'react';
import { useConfiguration } from '../hooks/useConfiguration';
import { MapboxConfig } from './config/MapboxConfig';
import { AWSConfig } from './config/AWSConfig';
import { GeocodingConfig } from './config/GeocodingConfig';
import { GoogleMapsConfig } from './config/GoogleMapsConfig';
import { HomeLocationConfig } from './config/HomeLocationConfig';
import { WigleConfig } from './config/WigleConfig';
import { SmartyConfig } from './config/SmartyConfig';

export const ConfigurationTab: React.FC = () => {
  const {
    isLoading,
    mapboxToken,
    setMapboxToken,
    mapboxUnlimitedApiKey,
    setMapboxUnlimitedApiKey,
    googleMapsApiKey,
    setGoogleMapsApiKey,
    awsRegion,
    setAwsRegion,
    opencageApiKey,
    setOpencageApiKey,
    geocodioApiKey,
    setGeocodioApiKey,
    locationIqApiKey,
    setLocationIqApiKey,
    smartyAuthId,
    setSmartyAuthId,
    smartyAuthToken,
    setSmartyAuthToken,
    mapboxConfigured,
    mapboxUnlimitedConfigured,
    googleMapsConfigured,
    wigleConfigured,
    awsConfigured,
    opencageConfigured,
    geocodioConfigured,
    locationIqConfigured,
    smartyConfigured,
    wigleApiName,
    setWigleApiName,
    wigleApiToken,
    setWigleApiToken,
    homeLocation,
    setHomeLocation,
    savedValues,
    homeLocationConfigured,
    saveMapboxToken,
    saveWigleCredentials,
    saveAwsRegion,
    saveGoogleMapsApiKey,
    saveOpencageApiKey,
    saveGeocodioApiKey,
    saveLocationIqApiKey,
    saveSmartyCredentials,
    saveHomeLocation,
  } = useConfiguration();

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Home Location - Top Left Priority */}
        <HomeLocationConfig
          lat={homeLocation.lat}
          lng={homeLocation.lng}
          radius={homeLocation.radius}
          setHomeLocation={setHomeLocation}
          isSaving={isLoading}
          onSave={saveHomeLocation}
          hasChanges={
            homeLocation.lat !== savedValues.homeLocation.lat ||
            homeLocation.lng !== savedValues.homeLocation.lng ||
            homeLocation.radius !== savedValues.homeLocation.radius
          }
          isLoading={isLoading}
          isConfigured={homeLocationConfigured}
        />

        {/* Mapbox */}
        <MapboxConfig
          mapboxToken={mapboxToken}
          setMapboxToken={setMapboxToken}
          savedMapboxToken={savedValues.mapboxToken}
          mapboxUnlimitedApiKey={mapboxUnlimitedApiKey}
          setMapboxUnlimitedApiKey={setMapboxUnlimitedApiKey}
          savedMapboxUnlimitedApiKey={savedValues.mapboxUnlimitedApiKey}
          isSaving={isLoading}
          onSave={saveMapboxToken}
          hasChanges={
            mapboxToken !== savedValues.mapboxToken ||
            mapboxUnlimitedApiKey !== savedValues.mapboxUnlimitedApiKey
          }
          isConfigured={mapboxConfigured || mapboxUnlimitedConfigured}
        />

        {/* WiGLE */}
        <WigleConfig
          wigleApiName={wigleApiName}
          setWigleApiName={setWigleApiName}
          savedWigleApiName={savedValues.wigleApiName}
          wigleApiToken={wigleApiToken}
          setWigleApiToken={setWigleApiToken}
          savedWigleApiToken={savedValues.wigleApiToken}
          isSaving={isLoading}
          onSave={saveWigleCredentials}
          isConfigured={wigleConfigured}
        />

        {/* AWS */}
        <AWSConfig
          awsRegion={awsRegion}
          setAwsRegion={setAwsRegion}
          savedAwsRegion={savedValues.awsRegion}
          awsAccessKeyId=""
          setAwsAccessKeyId={() => {}}
          savedAwsAccessKeyId=""
          awsSecretAccessKey=""
          setAwsSecretAccessKey={() => {}}
          savedAwsSecretAccessKey=""
          isSaving={isLoading}
          onSave={saveAwsRegion}
          hasChanges={awsRegion !== savedValues.awsRegion}
          isConfigured={awsConfigured}
        />

        {/* Geocoding */}
        <GeocodingConfig
          opencageApiKey={opencageApiKey}
          setOpencageApiKey={setOpencageApiKey}
          savedOpencageApiKey={savedValues.opencageApiKey}
          geocodioApiKey={geocodioApiKey}
          setGeocodioApiKey={setGeocodioApiKey}
          savedGeocodioApiKey={savedValues.geocodioApiKey}
          locationIqApiKey={locationIqApiKey}
          setLocationIqApiKey={setLocationIqApiKey}
          savedLocationIqApiKey={savedValues.locationIqApiKey}
          isSaving={isLoading}
          onSave={() => {
            if (opencageApiKey !== savedValues.opencageApiKey) saveOpencageApiKey();
            if (geocodioApiKey !== savedValues.geocodioApiKey) saveGeocodioApiKey();
            if (locationIqApiKey !== savedValues.locationIqApiKey) saveLocationIqApiKey();
          }}
          hasChanges={
            opencageApiKey !== savedValues.opencageApiKey ||
            geocodioApiKey !== savedValues.geocodioApiKey ||
            locationIqApiKey !== savedValues.locationIqApiKey
          }
          isConfigured={opencageConfigured || geocodioConfigured || locationIqConfigured}
        />

        {/* Google Maps */}
        <GoogleMapsConfig
          googleMapsApiKey={googleMapsApiKey}
          setGoogleMapsApiKey={setGoogleMapsApiKey}
          savedGoogleMapsApiKey={savedValues.googleMapsApiKey}
          isSaving={isLoading}
          onSave={saveGoogleMapsApiKey}
          hasChanges={googleMapsApiKey !== savedValues.googleMapsApiKey}
          isConfigured={googleMapsConfigured}
        />

        {/* Smarty */}
        <SmartyConfig
          smartyAuthId={smartyAuthId}
          setSmartyAuthId={setSmartyAuthId}
          savedSmartyAuthId={savedValues.smartyAuthId}
          smartyAuthToken={smartyAuthToken}
          setSmartyAuthToken={setSmartyAuthToken}
          savedSmartyAuthToken={savedValues.smartyAuthToken}
          isSaving={isLoading}
          onSave={saveSmartyCredentials}
          isConfigured={smartyConfigured}
        />
      </div>
    </div>
  );
};
