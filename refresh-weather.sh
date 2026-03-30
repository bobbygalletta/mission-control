#!/bin/bash
# Refreshes weather cache from Open-Meteo
CACHE="/Users/bobbygalletta/agent-mission-control/data/.weather_cache.json"
URL='https://api.open-meteo.com/v1/forecast?latitude=35.96&longitude=-83.92&hourly=temperature_2m,weathercode,precipitation,windspeed_10m,uv_index,relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min,weathercode,uv_index_max,precipitation_sum,sunrise,sunset&current_weather=true&forecast_days=3&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch&timezone=America%2FNew_York'
curl -s "$URL" -o "$CACHE" 2>/dev/null
