import { useState, useEffect } from 'react';
import { getCities } from '../api/cityApi';
import { CITIES as FALLBACK_CITIES } from '../constants/dutyFormFields';

export const useCities = () => {
  const [cities, setCities] = useState(FALLBACK_CITIES);

  useEffect(() => {
    getCities()
      .then(res => {
        const names = res.data.map(c => c.name);
        if (names.length > 0) setCities(names);
      })
      .catch(() => {});
  }, []);

  return cities;
};
