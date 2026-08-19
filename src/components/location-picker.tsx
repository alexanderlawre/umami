"use client";

import { useMemo, useState } from "react";
import { City, Country, State } from "country-state-city";

export type LocationValue = {
  country: string;
  state: string;
  city: string;
};

const selectClass =
  "mt-1 w-full rounded-xl border border-[#E8E6E0] bg-white px-3 py-2.5 text-base transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-[#1B4332] disabled:opacity-50";
const labelClass = "block text-sm font-medium text-[#1A1D1B]";

/**
 * Country → State/Province → City picker, backed by the offline
 * country-state-city dataset (no API key, no network calls). City lists can
 * run into the hundreds for large countries, so City is a searchable
 * text input with a filtered dropdown rather than a plain <select>.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}) {
  const countries = useMemo(() => Country.getAllCountries(), []);
  const selectedCountry = useMemo(
    () => countries.find((c) => c.name === value.country) ?? null,
    [countries, value.country]
  );
  const states = useMemo(
    () => (selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : []),
    [selectedCountry]
  );
  const selectedState = useMemo(
    () => states.find((s) => s.name === value.state) ?? null,
    [states, value.state]
  );
  const cities = useMemo(() => {
    if (!selectedCountry) return [];
    if (states.length > 0) {
      return selectedState
        ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode)
        : [];
    }
    return City.getCitiesOfCountry(selectedCountry.isoCode) ?? [];
  }, [selectedCountry, selectedState, states.length]);

  const [cityQuery, setCityQuery] = useState(value.city);
  const [cityOpen, setCityOpen] = useState(false);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    const list = q ? cities.filter((c) => c.name.toLowerCase().includes(q)) : cities;
    return list.slice(0, 50);
  }, [cities, cityQuery]);

  function handleCountryChange(name: string) {
    setCityQuery("");
    onChange({ country: name, state: "", city: "" });
  }

  function handleStateChange(name: string) {
    setCityQuery("");
    onChange({ ...value, state: name, city: "" });
  }

  function handleCitySelect(name: string) {
    setCityQuery(name);
    setCityOpen(false);
    onChange({ ...value, city: name });
  }

  const cityDisabled = !selectedCountry || (states.length > 0 && !selectedState);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <label className={labelClass}>Country</label>
        <select
          className={selectClass}
          value={value.country}
          onChange={(e) => handleCountryChange(e.target.value)}
        >
          <option value="">Select…</option>
          {countries.map((c) => (
            <option key={c.isoCode} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>State / Province</label>
        <select
          className={selectClass}
          value={value.state}
          disabled={!selectedCountry || states.length === 0}
          onChange={(e) => handleStateChange(e.target.value)}
        >
          <option value="">
            {selectedCountry && states.length === 0 ? "N/A" : "Select…"}
          </option>
          {states.map((s) => (
            <option key={s.isoCode} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <label className={labelClass}>City</label>
        <input
          type="text"
          className={selectClass}
          placeholder={cityDisabled ? "Select country/state first" : "Search for a city…"}
          disabled={cityDisabled}
          value={cityQuery}
          onChange={(e) => {
            setCityQuery(e.target.value);
            setCityOpen(true);
            onChange({ ...value, city: e.target.value });
          }}
          onFocus={() => setCityOpen(true)}
          onBlur={() => setTimeout(() => setCityOpen(false), 150)}
        />
        {cityOpen && !cityDisabled && filteredCities.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-[#E8E6E0] bg-white py-1 shadow-soft">
            {filteredCities.map((c) => (
              <li key={`${c.name}-${c.latitude}-${c.longitude}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleCitySelect(c.name)}
                  className="block w-full px-3 py-1.5 text-left text-sm text-[#1A1D1B] hover:bg-[#EDF3EF]"
                >
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
