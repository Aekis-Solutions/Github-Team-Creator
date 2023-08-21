export interface Team {
  id: number;
  name: string;
  node_id: string;
  slug: string;
  description: string;
  privacy: string;
  url: string;
  permission: string;
  parent: any | null;
  repositories: number[];
}
