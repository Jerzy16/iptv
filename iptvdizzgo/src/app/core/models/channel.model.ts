export interface Channel {
  name: string;
  url: string;
  tvgLogo: string;
  groupTitle: string;
}

export interface Category {
  name: string;
  channels: Channel[];
}
