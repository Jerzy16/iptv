export const STORAGE_KEYS = {
  session: (spaceId: string) => `dxdtv_session_${spaceId}`,
  channels: (spaceId: string) => `dxdtv_channels_${spaceId}`,
  lastChannel: (spaceId: string) => `dxdtv_last_channel_${spaceId}`,
  selectedSpace: 'dxdtv_selected_space',
} as const;
