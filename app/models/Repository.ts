export interface Repository {
  id: string;
  name: string;
  description: string;
  primaryLanguage: {
    name: string;
  };
  created: Date;
  pushed: Date;
  private: boolean;
  url: string;
}
