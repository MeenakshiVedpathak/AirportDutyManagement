import { useState, useEffect, useCallback } from 'react';
import { getCities, createCity } from '../api/cityApi';
import { CITIES as FALLBACK_CITIES } from '../constants/dutyFormFields';

export const useCities = () => {
  const [cities, setCities] = useState(FALLBACK_CITIES);

  const refresh = useCallback(() => {
    getCities()
      .then(res => {
        const names = res.data.map(c => c.name);
        if (names.length > 0) setCities(names);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addCity = useCallback(async (name) => {
    const trimmed = name.trim();
    await createCity(trimmed);
    await refresh();
    return trimmed;
  }, [refresh]);

  return { cities, addCity };
};
