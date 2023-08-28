const { graphql } = require("@octokit/graphql");
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
                  ids: nodes {
                    id
                  }
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

  async updateTeam(
    token: string,
    teamName: string,
    repositories: string[]
  ): Promise<void> {
    const mutation = `
    mutation UpdateTeamRepos($teamName: ID!, $repositoryIds: [ID!]!) {
      updateTeam(input: { teamName: $teamId, repositoryIds: $repositoryIds }) {
        team {
          name
          repositories {
            nodes {
              id
            }
          }
        }
      }
    }
  `;

    const variables = {
      teamId: teamName,
      repositoryIds: repositories,
    };

    const response = await graphql(mutation, variables, {
      headers: { authorization: `token ${token}` },
    });
  }
}
