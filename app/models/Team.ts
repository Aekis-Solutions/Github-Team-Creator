export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string;
  privacy: string;
  url: string;
  repositories: {
    ids: {
      id: string;
    }[];
  };
}
