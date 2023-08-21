export interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string;
  language: string;
  archived: boolean;
  created: Date;
  updated: Date;
  url: string;
  homepage: string;
}
