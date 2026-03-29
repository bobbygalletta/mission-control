import { useState, useEffect } from 'react';

interface HourlyForecast {
  time: string;
  temp: number;
  condition: string;
  icon: string;
  uvIndex: number;
  precip: number;
  humidity: number;
}

interface DailyForecast {
  day: string;
  high: number;
  low: number;
  condition: string;
  icon: string;
  uvIndex: number;
  precip: number;
  humidity: number;
  sunrise: string;
  sunset: string;
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  location: string;
  humidity: number;
  wind: number;
  uvIndex: number;
  precip: number;
  pressure: number;
  visibility: number;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

function getWeatherIcon(code: number, isNight: boolean = false): string {
  // WMO weather codes: 0=clear, 1=mainly clear, 2=partly cloudy, 3=overcast
  // 45,48=fog, 51,53,55=drizzle, 61,63,65=rain, 71,73,75=snow, 80,81,82=rain showers
  // 95,96,99=thunderstorm
  if (code === 0) return isNight ? '🌙' : '☀️';
  if (code === 1) return isNight ? '🌙' : '☀️';
  if (code === 2) return isNight ? '☁️' : '⛅';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 55) return '🌧️';
  if (code >= 61 && code <= 65) return '🌧️';
  if (code >= 71 && code <= 75) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return isNight ? '🌙' : '🌤️';
}

function getCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly Clear';
  if (code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain Showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Unknown';
}

function formatHourFromISO(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const hour = date.getHours();
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));
  
  // "Now" only if this IS the current hour (diffMins == 0 means the slot's hour matches now)
  if (diffMins === 0) return 'Now';
  // Otherwise show the actual hour label
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} AM`;
}

function formatDay(dateStr: string, index: number): string {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const fetchWeather = async () => {
    try {
      // Fetch both current + hourly from Open-Meteo (Knoxville TN lat/lon)
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=35.96&longitude=-83.92' +
        '&hourly=temperature_2m,weathercode,precipitation,windspeed_10m,uv_index,relativehumidity_2m' +
        '&daily=temperature_2m_max,temperature_2m_min,weathercode,uv_index_max,precipitation_sum' +
        '&current_weather=true&forecast_days=2&temperature_unit=fahrenheit&windspeed_unit=mph' +
        '&precipitation_unit=inch&timezone=America%2FNew_York'
      );
      const data = await res.json();
      
      // Use browser's local time — API times are in ET (timezone=America/New_York), getHours() gives local hour in ET
      const now = new Date();
      const currentHourLocal = now.getHours();
      const currentDateLocal = now.getDate();
      const isNight = currentHourLocal < 6 || currentHourLocal > 20;
      
      const current = data.current_weather;
      const hourly = data.hourly;
      
      // Find the first hourly slot where the hour has NOT yet passed
      // API times are in ET, getHours() gives local ET hour — they should match
      let currentIndex = -1;
      for (let i = 0; i < hourly.time.length; i++) {
        const apiHour = parseInt(hourly.time[i].split('T')[1].split(':')[0], 10);
        const apiDate = parseInt(hourly.time[i].split('T')[0].split('-')[2], 10);
        if (apiHour > currentHourLocal || (apiHour === currentHourLocal && apiDate >= currentDateLocal)) {
          currentIndex = i;
          break;
        }
      }
      // Fallback: start at beginning if nothing found
      if (currentIndex === -1) currentIndex = 0;
      
      // Build hourly forecast (next 36 hours = rest of today + all of tomorrow for expanded day view)
      const hourlyData: HourlyForecast[] = [];
      for (let i = 0; i < 36; i++) {
        const idx = currentIndex + i;
        if (idx < hourly.time.length) {
          hourlyData.push({
            time: hourly.time[idx],
            temp: Math.round(hourly.temperature_2m[idx]),
            condition: getCondition(hourly.weathercode[idx]),
            icon: getWeatherIcon(hourly.weathercode[idx], isNight && i === 0),
            uvIndex: hourly.uv_index[idx] || 0,
            precip: hourly.precipitation[idx] || 0,
            humidity: hourly.relativehumidity_2m[idx] || 0,
          });
        }
      }
      
      // Build 2-day forecast (today + tomorrow)
      const dailyData: DailyForecast[] = [];
      for (let i = 0; i < 2; i++) {
        const code = data.daily.weathercode[i * 24] || 0;
        dailyData.push({
          day: formatDay(data.daily.time[i], i),
          high: Math.round(data.daily.temperature_2m_max[i]),
          low: Math.round(data.daily.temperature_2m_min[i]),
          condition: getCondition(code),
          icon: getWeatherIcon(code),
          uvIndex: data.daily.uv_index_max[i] || 0,
          precip: data.daily.precipitation_sum[i] || 0,
          humidity: hourly.relativehumidity_2m[i * 24 + 12] || 50,
          sunrise: '',
          sunset: '',
        });
      }
      
      setWeather({
        temp: Math.round(current.temperature),
        feelsLike: Math.round(current.temperature), // Open-Meteo doesn't have feels-like
        condition: getCondition(current.weathercode),
        icon: getWeatherIcon(current.weathercode, isNight),
        location: 'Knoxville, TN',
        humidity: hourly.relativehumidity_2m[currentIndex] || 50,
        wind: Math.round(current.windspeed),
        uvIndex: hourly.uv_index[currentIndex] || 0,
        precip: hourly.precipitation[currentIndex] || 0,
        pressure: 0,
        visibility: 10,
        hourly: hourlyData,
        daily: dailyData,
      });
      setError(null);
    } catch (e) {
      setError('Weather unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const id = setInterval(fetchWeather, 60_000);
    return () => clearInterval(id);
  }, []);

  const getUVLabel = (uv: number): string => {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  };

  const getUVColor = (uv: number): string => {
    if (uv <= 2) return 'text-emerald-400';
    if (uv <= 5) return 'text-yellow-400';
    if (uv <= 7) return 'text-orange-400';
    if (uv <= 10) return 'text-red-400';
    return 'text-violet-400';
  };

  return (
    <div className="backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
        <span className="text-3xl">{weather?.icon || '🌤️'}</span>
        <div>
          <h2 className="text-base font-semibold text-slate-100">Weather</h2>
          <p className="text-[11px] text-slate-500">{weather?.location || 'Knoxville, TN'}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {loading && weather === null ? (
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
          ) : error ? (
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading && weather === null ? (
        <div className="flex flex-col items-center justify-center py-12 px-5">
          <div className="text-6xl opacity-20 animate-pulse">🌤️</div>
          <p className="text-sm text-slate-500 mt-3">Loading weather...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 px-5">
          <span className="text-4xl opacity-40">⚠️</span>
          <p className="text-sm text-slate-500 mt-2">Weather unavailable</p>
        </div>
      ) : weather ? (
        <div>
          {/* Current + Hourly */}
          <div className="px-5 py-4 border-b border-white/[0.06]">
            {/* Current conditions */}
            <div className="flex items-start justify-between">
              <div>
                <div className="text-7xl font-thin text-slate-100 leading-none">
                  {weather.temp}°
                </div>
                <p className="text-sm text-slate-400 mt-1">{weather.condition}</p>
              </div>
              <div className="text-right space-y-1.5">
                <p className="text-xs text-slate-500">
                  <span className="text-slate-400">Feels</span> {weather.feelsLike}°
                </p>
                <p className="text-xs text-slate-500">
                  <span className="text-slate-400">High</span> {weather.daily[0]?.high || weather.temp}°
                </p>
                <p className="text-xs text-slate-500">
                  <span className="text-slate-400">Low</span> {weather.daily[0]?.low || weather.temp}°
                </p>
              </div>
            </div>

            {/* Hourly forecast */}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Hourly Forecast</p>
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
                {weather.hourly.slice(0, 12).map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[52px]">
                    <span className="text-[11px] text-slate-400">{formatHourFromISO(h.time)}</span>
                    <span className="text-xl">{h.icon}</span>
                    <span className="text-[13px] font-medium text-slate-200">{h.temp}°</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3-Day Forecast */}
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Upcoming Weather</p>
            <div className="space-y-2.5">
              {weather.daily.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                  className="w-full flex items-center justify-between hover:bg-white/[0.04] rounded-lg px-2 py-1 -mx-2 transition-colors cursor-pointer"
                >
                  <span className="text-sm text-slate-300 w-20">{d.day}</span>
                  <span className="text-lg">{d.icon}</span>
                  <span className="text-xs text-slate-500 w-16 text-right">
                    {d.high}° <span className="text-slate-600">{d.low}°</span>
                  </span>
                  <span className={`text-slate-500 transition-transform duration-200 ${expandedDay === i ? 'rotate-90' : ''}`}>
                    ›
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Day Detail Modal */}
          {expandedDay !== null && weather.daily[expandedDay] && (
            <div className="fixed inset-0 z-50 flex items-end justify-center">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setExpandedDay(null)}
              />
              {/* Panel */}
              <div className="relative w-full max-w-md mx-auto rounded-t-2xl bg-transparent backdrop-blur-xl border border-white/[0.15] overflow-hidden animate-slideUp">
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>
                {/* Header */}
                <div className="flex items-center gap-4 px-5 pb-4">
                  <span className="text-5xl">{weather.daily[expandedDay].icon}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-100">{weather.daily[expandedDay].day}</h3>
                    <p className="text-sm text-slate-400">{weather.daily[expandedDay].condition}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-3xl font-thin text-slate-100">{weather.daily[expandedDay].high}°</p>
                    <p className="text-sm text-slate-500">High / <span className="text-slate-400">{weather.daily[expandedDay].low}°</span> Low</p>
                  </div>
                </div>
                {/* Hourly for selected day */}
                <div className="px-5 pb-6">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Hour by Hour</p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {weather.hourly
                      .filter((h) => {
                        const hDate = new Date(h.time);
                        const dayStart = new Date();
                        dayStart.setHours(0, 0, 0, 0);
                        dayStart.setDate(dayStart.getDate() + expandedDay);
                        const dayEnd = new Date(dayStart);
                        dayEnd.setDate(dayEnd.getDate() + 1);
                        return hDate >= dayStart && hDate < dayEnd;
                      })
                      .map((h, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[56px]">
                          <span className="text-[11px] text-slate-400">{formatHourFromISO(h.time)}</span>
                          <span className="text-2xl">{h.icon}</span>
                          <span className="text-[13px] font-medium text-slate-200">{h.temp}°</span>
                        </div>
                      ))}
                  </div>
                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase">UV Index</p>
                      <p className={`text-sm font-semibold mt-0.5 ${getUVColor(weather.daily[expandedDay].uvIndex)}`}>
                        {weather.daily[expandedDay].uvIndex}
                      </p>
                      <p className="text-[10px] text-slate-500">{getUVLabel(weather.daily[expandedDay].uvIndex)}</p>
                    </div>
                    <div className="bg-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase">Precip</p>
                      <p className="text-sm font-semibold text-slate-200 mt-0.5">{weather.daily[expandedDay].precip.toFixed(2)} in</p>
                    </div>
                    <div className="bg-white/[0.06] rounded-xl p-3 text-center">
                      <p className="text-[10px] text-slate-500 uppercase">Humidity</p>
                      <p className="text-sm font-semibold text-slate-200 mt-0.5">{weather.daily[expandedDay].humidity}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Weather Details Grid */}
          <div className="px-5 py-4 grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                <span className="text-sm">💧</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Humidity</p>
                <p className="text-sm font-medium text-slate-200">{weather.humidity}%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                <span className="text-sm">💨</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Wind</p>
                <p className="text-sm font-medium text-slate-200">{weather.wind} mph</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                <span className="text-sm">☀️</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">UV Index</p>
                <p className={`text-sm font-medium ${getUVColor(weather.uvIndex)}`}>
                  {weather.uvIndex} {getUVLabel(weather.uvIndex)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center">
                <span className="text-sm">🌧️</span>
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Precipitation</p>
                <p className="text-sm font-medium text-slate-200">{weather.precip.toFixed(2)} in</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
