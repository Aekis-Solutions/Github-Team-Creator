import { graphql } from "@octokit/graphql";
import { Octokit } from "@octokit/rest";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { Repository } from "../models/Repository";

export class GithubService {
  async fetchCurrentUser(token: string): Promise<User> {
    const query = `
      query {
        viewer {
          id
          name
          avatarUrl
        }
      }
    `;

    const response = await graphql(query, {
      headers: { authorization: `token ${token}` },
    });

    return response.viewer;
  }

  async fetchTeams(token: string, organization: string): Promise<Team[]> {
    let hasNextPage = true;
    let endCursor = null;
    let allTeams: Team[] = [];

    while (hasNextPage) {
      const query = `
        query GetTeams($organization: String!, $endCursor: String) {
          organization(login: $organization) {
            teams(first: 100, after: $endCursor) {
              nodes {
                id
                name
                slug
                description
                privacy
                url
                repositories {
                  totalCount
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `;

      const variables = {
        organization: organization,
        endCursor: endCursor,
        headers: { authorization: `token ${token}` },
      };

      const response: any = await graphql(query, variables);

      const teams = response.organization.teams.nodes;
      allTeams = [...allTeams, ...teams];
      hasNextPage = response.organization.teams.pageInfo.hasNextPage;
      endCursor = response.organization.teams.pageInfo.endCursor;
    }

    return allTeams;
  }

  async fetchRepositories(
    token: string,
    organization: string
  ): Promise<Repository[]> {
    let hasNextPage = true;
    let endCursor = null;
    let allRepositories: Repository[] = [];

    while (hasNextPage) {
      const query = `
        query GetRepositories($organization: String!, $endCursor: String) {
          organization(login: $organization) {
            repositories(first: 100, after: $endCursor) {
              nodes {
                id
                name
                description
                primaryLanguage {
                  name
                }
                created: createdAt
                pushed: pushedAt
                private: isPrivate
                url
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
        `;

      const variables = {
        organization: organization,
        endCursor: endCursor,
        headers: { authorization: `token ${token}` },
      };

      const response: any = await graphql(query, variables);

      const repositories = response.organization.repositories.nodes;
      allRepositories = [...allRepositories, ...repositories];
      hasNextPage = response.organization.repositories.pageInfo.hasNextPage;
      endCursor = response.organization.repositories.pageInfo.endCursor;
    }

    return allRepositories;
  }

  async fetchTeamRepositoryIds(
    token: string,
    organization: string,
    teamSlug: string
  ): Promise<string[]> {
    let hasNextPage = true;
    let endCursor = null;
    let allRepositoryIds: string[] = [];

    while (hasNextPage) {
      const query = `
        query GetTeamRepositoryIds($organization: String!, $teamSlug: String!, $endCursor: String) {
          organization(login: $organization) {
            team(slug: $teamSlug) {
              id
              repositories(first: 100, after: $endCursor) {
                totalCount
                ids: nodes {
                  id
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
          }
        }
      `;

      const variables = {
        organization: organization,
        teamSlug: teamSlug,
        endCursor: endCursor,
        headers: { authorization: `token ${token}` },
      };

      const response: any = await graphql(query, variables);

      const repositoryIds: { id: string }[] =
        response.organization.team.repositories.ids;
      allRepositoryIds = [
        ...allRepositoryIds,
        ...repositoryIds.map((objectId) => objectId.id),
      ];
      hasNextPage =
        response.organization.team.repositories.pageInfo.hasNextPage;
      endCursor = response.organization.team.repositories.pageInfo.endCursor;
    }

    return allRepositoryIds;
  }

  async associateRepoWithTeam(
    token: string,
    organization: string,
    team: Team,
    repository: Repository
  ): Promise<void> {
    try {
      const octokit = new Octokit();
      const params = {
        headers: { authorization: `token ${token}` },
        org: organization,
        team_slug: team.slug,
        owner: organization, // Assuming the repos are in the same organization
        repo: repository.name,
      };
      await octokit.teams.addOrUpdateRepoPermissionsInOrg(params);
    } catch (error) {
      console.error("Error associating repository with team:", error);
    }
  }

  async disassociateRepoWithTeam(
    token: string,
    organization: string,
    team: Team,
    repository: Repository
  ): Promise<void> {
    try {
      const octokit = new Octokit();
      const params = {
        headers: { authorization: `token ${token}` },
        org: organization,
        team_slug: team.slug,
        owner: organization, // Assuming the repos are in the same organization
        repo: repository.name,
      };
      await octokit.teams.removeRepoInOrg(params);
    } catch (error) {
      console.error("Error disassociating repository with team:", error);
    }
  }
}
