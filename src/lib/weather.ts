export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear skies';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Fog';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 86) return 'Snow showers';
  return 'Thunderstorms';
}
export function weatherIcon(code: number): string {
  if (code === 0) return 'sun';
  if (code <= 3) return 'cloud-sun';
  if (code <= 48) return 'cloud-fog2';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'cloud-rain';
  if (code <= 86) return 'cloud-snow';
  return 'cloud-lightning-rain';
}
