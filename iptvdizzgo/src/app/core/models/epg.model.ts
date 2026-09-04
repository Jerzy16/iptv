export interface Program {
  title: string;
  description?: string;
  start: string;
  end: string;
}

export interface EpgGuide {
  channelId: string;
  programs: Program[];
}
