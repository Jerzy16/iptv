export interface EntertainmentSpace {
  id: string;
  name: string;
  logo: string;
  requiresAuth: boolean;
  source: {
    type: 'xtream-api' | 'm3u';
    host: string;
  };
}
