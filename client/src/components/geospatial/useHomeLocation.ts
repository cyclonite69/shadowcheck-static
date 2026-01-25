import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { DEFAULT_HOME_RADIUS } from '../../constants/network';

interface UseHomeLocationParams {
  setHomeLocation: Dispatch<
    SetStateAction<{
      center: [number, number];
      radius: number;
    }>
  >;
  logError: (message: string, error: unknown) => void;
}

export const useHomeLocation = ({ setHomeLocation, logError }: UseHomeLocationParams) => {
  useEffect(() => {
    const fetchHomeLocation = async () => {
      try {
        const response = await fetch('/api/home-location');
        if (response.ok) {
          const data = await response.json();
          if (data.latitude && data.longitude) {
            setHomeLocation({
              center: [data.longitude, data.latitude],
              radius: data.radius || DEFAULT_HOME_RADIUS,
            });
          }
        }
      } catch (error) {
        logError('Failed to fetch home location', error);
      }
    };

    fetchHomeLocation();
  }, [logError, setHomeLocation]);
};
