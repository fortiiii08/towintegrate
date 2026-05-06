export interface Client {
  id: number;
  name: string;
  image?: string;
  lastRecordingDate?: Date;
  videosRecorded?: number;
}
