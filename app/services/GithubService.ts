let { graphql } = require("@octokit/graphql");
import { Team } from "../models/Team";
import { User } from "../models/User";
import { Repository } from "../models/Repository";

export class GitHubService {
  async fetchAuthenticatedUser(token: string): Promise<User> {
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
    const query = `
      query {
        viewer {
          organization(login: "$organization") {
            teams() {
              nodes {
                id
                name
                slug
                description
                privacy
                url
                permission
                parent {
                  id
                }
                repositories() {
                  nodes {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `;

    const variables = {
      organization: organization,
    };

    const response = await graphql(query, {
      headers: { authorization: `token ${token}` },
    });

    return response.viewer.organization.teams.nodes;
  }

  async fetchRepositories(token: string): Promise<Repository[]> {
    const query = `
      query {
        viewer {
          repositories() {
            nodes {
              id
              name
              fullName
              description
              language
              archived
              createdAt
              updatedAt
              url
              homepageUrl
            }
          }
        }
      }
    `;

    const response = await graphql(query, {
      headers: { authorization: `token ${token}` },
    });

    return response.viewer.repositories.nodes;
  }

  async updateTeam(token: string, team: Team): Promise<void> {
    const mutation = `
    mutation UpdateTeamRepos($teamId: ID!, $repositoryIds: [ID!]!) {
      updateTeam(input: { teamId: $teamId, repositoryIds: $repositoryIds }) {
        team {
          id
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
      teamId: team.id,
      repositoryIds: team.repositories,
    };

    const response = await graphql(mutation, variables, {
      headers: { authorization: `token ${token}` },
    });
  }
}
