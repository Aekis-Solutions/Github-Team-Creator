"use client";

import { useState, useEffect, ChangeEvent } from "react";
import "tailwindcss/tailwind.css";
import styles from "@/app/styles.module.css";

import GithubConnectionPanel from "@/components/GithubConnectionPanel";
import TeamRepositorySelector from "@/components/TeamRepositorySelector";

import { GithubService } from "@/app/services/GithubService";
import { Repository } from "@/app/models/Repository";
import { Team } from "@/app/models/Team";
import { User } from "@/app/models/User";

export default function Home() {
  const [token, setToken] = useState<string>("");
  const [organization, setOrganization] = useState<string>("");

  const [currentUser, setCurrentUser] = useState<User>();
  const [loadingCurrentUser, setLoadingCurrentUser] = useState<boolean>(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [loadingTeamRepositoryIds, setLoadingTeamRepositoryIds] =
    useState<boolean>(false);
  const [updatingTeam, setUpdatingTeam] = useState<boolean>(false);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepositories, setLoadingRepositories] =
    useState<boolean>(false);

  const [error, setError] = useState<any>(null);

  const githubService = new GithubService();

  const initializeStore = () => {
    setToken(localStorage.getItem("token") || "");
    setOrganization(localStorage.getItem("organization") || "");
  };

  const fetchCurrentUser = async () => {
    setError(null);
    setLoadingCurrentUser(true);

    setCurrentUser(undefined);

    try {
      const user = await githubService.fetchCurrentUser(token);

      setCurrentUser(user);
    } catch (error: any) {
      setError(`fetchCurrentUser: ${error.message}`);
      console.error(error);
    } finally {
      setLoadingCurrentUser(false);
    }
  };

  const fetchTeams = async () => {
    setError(null);
    setLoadingTeams(true);

    setTeams([]);
    setSelectedTeam("");

    try {
      const teams = await githubService.fetchTeams(token, organization);

      const sortedTeams = teams.sort((a, b) => a.name.localeCompare(b.name));

      setTeams(sortedTeams);
    } catch (error: any) {
      setError(`fetchTeams: ${error.message}`);
      console.error(error);
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchRepositories = async () => {
    setError(null);
    setLoadingRepositories(true);

    setRepositories([]);

    try {
      const repositories = await githubService.fetchRepositories(
        token,
        organization
      );

      const sortedRepositories = repositories.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setRepositories(sortedRepositories);
    } catch (error: any) {
      setError(`fetchRepositories: ${error.message}`);
      console.error(error);
    } finally {
      setLoadingRepositories(false);
    }
  };

  const fetchTeamRepositoryIds = async (teamId: string) => {
    setError(null);
    setLoadingTeamRepositoryIds(true);

    try {
      const team = teams.find((t) => t.name === teamId);

      if (team) {
        const teamRepositoryIds = await githubService.fetchTeamRepositoryIds(
          token,
          organization,
          team.slug
        );

        team.repositories = {
          totalCount: teamRepositoryIds.length,
          ids: teamRepositoryIds,
        };
      }
    } catch (error: any) {
      setError(`fetchTeamRepositoryIds: ${error.message}`);
      console.error(error);
    } finally {
      setLoadingTeamRepositoryIds(false);
    }
  };

  const updateSelectedTeam = async (
    team: Team,
    repositoryToDisassociate: string[],
    repositoryToAssociate: string[]
  ) => {
    try {
      setError(null);

      setUpdatingTeam(true);

      repositoryToDisassociate.forEach(async (repositoryId) => {
        const repository = repositories.find((r) => r.id === repositoryId);
        if (repository) {
          await githubService.disassociateRepoWithTeam(
            token,
            organization,
            team,
            repository
          );
        }
      });

      repositoryToAssociate.forEach(async (repositoryId) => {
        const repository = repositories.find((r) => r.id === repositoryId);
        if (repository) {
          await githubService.associateRepoWithTeam(
            token,
            organization,
            team,
            repository
          );
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      await fetchTeams();
    } catch (error: any) {
      setError(`updateTeam: ${error.message}`);
      console.error(error);
    } finally {
      setUpdatingTeam(false);
    }
  };

  const handleTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newToken = e.target.value;
    setToken(newToken);
    localStorage.setItem("token", newToken); // Update localStorage
  };

  const handleOrganizationChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newOrganization = e.target.value;
    setOrganization(newOrganization);
    localStorage.setItem("organization", newOrganization); // Update localStorage
  };

  const handleTeamChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const newSelectedTeam = e.target.value;
    await fetchTeamRepositoryIds(newSelectedTeam);
    setSelectedTeam(newSelectedTeam);
  };

  useEffect(() => {
    initializeStore();

    if (token && organization) {
      fetchCurrentUser();
      fetchRepositories();
      fetchTeams();
    }
  }, [token, organization]);

  return (
    <div className={`${styles.container} mb-6 mt-6`}>
      <h1>GitHub Repository Manager</h1>
      <GithubConnectionPanel
        token={token}
        organization={organization}
        error={error}
        onTokenChange={handleTokenChange}
        onOrganizationChange={handleOrganizationChange}
      />
      <div>
        {!teams || teams.length <= 0 ? (
          <></>
        ) : (
          <>
            <div className="m-4">
              {loadingTeams ? (
                "Loading teams..."
              ) : (
                <>
                  <label className="">Select a Team:</label>
                  <div className="flex items-center">
                    <select
                      title="team"
                      value={selectedTeam}
                      onChange={handleTeamChange}
                      disabled={loadingTeamRepositoryIds}
                      className={`${styles["select-field"]} w-full`}
                    >
                      <option value="">Select</option>
                      {teams.map((team: Team) => (
                        <option key={team.id} value={team.name}>
                          {team.name} ({team.repositories.totalCount})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={fetchTeams} // Call the function to refresh teams
                      disabled={loadingTeamRepositoryIds}
                      className={`${styles["button-field"]} text-2xl px-4 rounded`}
                    >
                      ↻
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="m-4">
              {(loadingRepositories && (
                <label>Loading repositories...</label>
              )) ||
                (loadingTeamRepositoryIds && (
                  <label>Loading Team Repositories</label>
                )) ||
                (!selectedTeam && <label>Select a team...</label>) || (
                  <>
                    <label>
                      Select some repositories to associate to {selectedTeam}:
                    </label>
                    <TeamRepositorySelector
                      team={teams.find((t) => t.name === selectedTeam)}
                      repositories={repositories}
                      updateTeam={updateSelectedTeam}
                    />
                  </>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
