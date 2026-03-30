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
  // WMO weather codes
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

function getWeatherIconWttr(code: string | number, isNight: boolean = false): string {
  // wttr.in weather codes: 113=clear, 116=partly cloudy, 119=cloudy, 122=overcast
  // 143=haze, 176/179=light rain, 182/185/281/284/299/302/305/308/311/314/317/320/323/326/329/332/335/338/350/353/356/359/362/365/368/371/374/377=rain/drizzle
  // 386/389/392=thunderstorm, 230/227/230=snow
  const c = typeof code === 'string' ? parseInt(code, 10) : code;
  if (c === 113 || c === '113') return isNight ? '🌙' : '☀️';
  if (c === 116 || c === '116') return isNight ? '☁️' : '⛅';
  if (c === 119 || c === '119') return '☁️';
  if (c === 122 || c === '122') return '☁️';
  if (c === 143 || c === '143') return '🌫️';
  if ([176, 179, 182, 185, 281, 284, 299, 302, 305, 308, 311, 314, 317, 320, 323, 326, 329, 332, 335, 338, 350, 353, 356, 359, 362, 365, 368, 371, 374, 377].includes(c)) return '🌧️';
  if (c === 200 || c === '200') return '⛈️';
  if ([386, 389, 392, 395].includes(c)) return '⛈️';
  if ([227, 230, 233, 200].includes(c)) return '❄️';
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
  // Parse "2026-03-30T12:00" — show "Now" for current hour, else hour label
  const parts = isoString.split('T');
  const hour = parseInt(parts[1]?.split(':')[0] ?? '0', 10);
  const now = new Date();
  const currentHour = now.getHours();
  if (Math.abs(hour - currentHour) <= 1) return 'Now';
  if (hour === 0) return '12AM';
  if (hour === 12) return '12PM';
  if (hour > 12) return `${hour - 12}PM`;
  return `${hour}AM`;
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
      // Fetch via API server proxy (wttr.in)
      const res = await fetch('/api/weather');
      const data = await res.json();
      if (data.error) { setError('Weather unavailable'); return; }

      const now = new Date();
      const currentHour = now.getHours();
      const isNight = currentHour < 6 || currentHour > 20;

      const cc = data.current_condition[0];
      const weatherDays = data.weather || [];

      // Build hourly from wttr.in (3-hour slots: minutes-since-midnight = 0, 300, 600...)
      // Interpolate to fill every hour, start from current hour
      const allSlots: Array<{day: number; slotHour: number; tempF: number; weatherCode: string; weatherDesc: string; uvIndex: number; precipInches: number; humidity: number}> = [];
      for (let di = 0; di < Math.min(3, weatherDays.length); di++) {
        const day = weatherDays[di];
        for (const h of day.hourly || []) {
          const slotHour = Math.floor(parseInt(h.time, 10) / 60); // minutes -> hour
          if (isNaN(slotHour) || slotHour > 23) continue;
          allSlots.push({
            day: di,
            slotHour,
            tempF: parseInt(h.tempF, 10),
            weatherCode: h.weatherCode || '113',
            weatherDesc: (h.weatherDesc?.[0]?.value || 'Unknown').trim(),
            uvIndex: parseInt(h.uvIndex || '0', 10),
            precipInches: parseFloat(h.precipInches || '0'),
            humidity: parseInt(h.humidity || '50', 10),
          });
        }
      }

      const hourlyData: HourlyForecast[] = [];
      // Hours from now through end of today + all of tomorrow
      for (let di = 0; di < 2; di++) {
        const daySlots = allSlots.filter(s => s.day === di).sort((a, b) => a.slotHour - b.slotHour);
        if (!daySlots.length) continue;
        const dayDate = weatherDays[di].date;
        const startH = di === 0 ? currentHour : 0;
        for (let h = startH; h < 24; h++) {
          const before = [...daySlots].reverse().find(s => s.slotHour <= h);
          const after = daySlots.find(s => s.slotHour > h);
          let temp = 0, uvIdx = 0, precip = 0, humidity = 50, weatherCode = '113', weatherDesc = 'Unknown';
          if (before && after) {
            const t = (h - before.slotHour) / (after.slotHour - before.slotHour);
            temp = Math.round(before.tempF + t * (after.tempF - before.tempF));
            uvIdx = Math.round(before.uvIndex + t * (after.uvIndex - before.uvIndex));
            precip = Math.round((before.precipInches + t * (after.precipInches - before.precipInches)) * 100) / 100;
            humidity = Math.round(before.humidity + t * (after.humidity - before.humidity));
            weatherCode = before.weatherCode;
            weatherDesc = before.weatherDesc;
          } else if (before) {
            temp = before.tempF; uvIdx = before.uvIndex; precip = before.precipInches;
            humidity = before.humidity; weatherCode = before.weatherCode; weatherDesc = before.weatherDesc;
          }
          const isNow = di === 0 && h === currentHour;
          hourlyData.push({
            time: dayDate + 'T' + String(h).padStart(2, '0') + ':00',
            temp,
            condition: weatherDesc,
            icon: getWeatherIconWttr(weatherCode, isNight && isNow),
            uvIndex: uvIdx,
            precip,
            humidity,
          });
        }
      }

      // Build daily forecast (today + tomorrow)
      const dailyData: DailyForecast[] = [];
      for (let i = 0; i < Math.min(2, weatherDays.length); i++) {
        const d = weatherDays[i];
        const maxT = Math.max(...(d.hourly || []).map((h: Record<string,string>) => parseInt(h.tempF || '0', 10)));
        const minT = Math.min(...(d.hourly || []).map((h: Record<string,string>) => parseInt(h.tempF || '999', 10)));
        const avgHumidity = Math.round(
          (d.hourly || []).reduce((s: number, h: Record<string,string>) => s + parseInt(h.humidity || '50', 10), 0) /
          Math.max(1, (d.hourly || []).length)
        );
        const midday = d.hourly?.[12];
        const weatherCode = midday?.weatherCode || '113';
        dailyData.push({
          day: formatDay(d.date, i),
          high: maxT,
          low: minT,
          condition: midday?.weatherDesc?.[0]?.value?.trim() || 'Unknown',
          icon: getWeatherIconWttr(weatherCode, false),
          uvIndex: parseInt(midday?.uvIndex || '0', 10),
          precip: parseFloat(d.hourly?.reduce((s: number, h: Record<string,string>) => s + parseFloat(h.precipMM || '0'), 0)?.toFixed(1) || '0'),
          humidity: avgHumidity,
          sunrise: d.sunrise?.[0] || '',
          sunset: d.sunset?.[0] || '',
        });
      }

      setWeather({
        temp: parseInt(cc.temp_F, 10),
        feelsLike: parseInt(cc.FeelsLikeF || cc.temp_F, 10),
        condition: cc.weatherDesc?.[0]?.value?.trim() || 'Unknown',
        icon: getWeatherIconWttr(cc.weatherCode || '113', isNight),
        location: data.nearest_area?.[0]?.areaName?.[0]?.value || 'Knoxville, TN',
        humidity: parseInt(cc.humidity || '50', 10),
        wind: parseInt(cc.windspeedMiles || '0', 10),
        uvIndex: parseInt(cc.UVIndex || '0', 10),
        precip: parseFloat(cc.precipInches || '0'),
        pressure: parseInt(cc.pressure || '1013', 10),
        visibility: parseInt(cc.visibilityMiles || '10', 10),
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
