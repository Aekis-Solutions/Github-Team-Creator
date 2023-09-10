export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string;
  privacy: string;
  url: string;
  repositories: {
    totalCount: number;
    ids: string[];
  };
}
