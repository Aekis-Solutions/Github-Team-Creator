"use client";

import { useState, useEffect, useMemo, ChangeEvent } from "react";
import {
  Column,
  useGlobalFilter,
  useRowSelect,
  useSortBy,
  useTable,
} from "react-table";
import "tailwindcss/tailwind.css";
import styles from "./styles.module.css";

import { Octokit } from "@octokit/rest";
import { Repository } from "./models/Repository";
import { Owner } from "./models/User";
import { Team } from "./models/Team";
import IndeterminateCheckbox from "@/components/IndeterminateCheckbox";

export default function Home() {
  const [token, setToken] = useState<string>("");
  const [organization, setOrganization] = useState<string>("");
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedRepos, setSelectedRepos] = useState<number[]>([]);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    initializeStore();

    if (token && organization) {
      fetchRepositories();
      fetchTeams();
    }
  }, [token, organization]);

  const initializeStore = () => {
    setToken(localStorage.getItem("token") || "");
    setOrganization(localStorage.getItem("organization") || "");
  };

  const fetchRepositories = async () => {
    try {
      setError(null);

      const octokit = new Octokit({ auth: token });
      const result = await octokit.repos.listForOrg({
        org: organization,
        type: "all",
        per_page: 1000,
      });

      const repos = Array.from(result.data)
        .map((i) => toRepository(i))
        .sort((a, b) => a.name.localeCompare(b.name));

      setRepositories(repos);
    } catch (error: any) {
      setError(`fetchRepositories: ${error.message}`);
      console.error(error);
    }
  };

  const toRepository = (source: any): Repository => {
    return {
      id: source.id,
      name: source.name,
      fullName: source.full_name,
      description: source.description,
      language: source.language,
      archived: source.archived,
      owner: toOwner(source.owner),
      created: new Date(source.created_at),
      updated: new Date(source.updated_at),
      url: source.html_url,
      homepage: source.homepage,
      stargazersCount: source.stargazers_count,
      watchersCount: source.watchers_count,
      forksCount: source.forks_count,
      openIssueCount: source.open_issues_count,
    } as Repository;
  };

  const toOwner = (source: any): Owner => {
    return {
      id: source.id,
      name: source.login,
      type: source.type,
      url: source.html_url,
      avatarUrl: source.avatar_url,
    } as Owner;
  };

  const toTeam = (source: any): Team => {
    return {
      id: source.id,
      name: source.name,
      node_id: source.node_id,
      slug: source.slug,
      description: source.description,
      privacy: source.privacy,
      notification_setting: source.notification_setting,
      url: source.url,
      html_url: source.html_url,
      members_url: source.members_url,
      repositories_url: source.repositories_url,
      permission: source.permission,
      parent: source.parent,
    } as Team;
  };

  const fetchTeams = async () => {
    try {
      setError(null);

      const octokit = new Octokit({ auth: token });
      const result = await octokit.teams.list({
        org: organization,
        type: "all",
        per_page: 1000,
      });

      const teams = Array.from(result.data)
        .map((i) => toTeam(i))
        .sort((a, b) => a.name.localeCompare(b.name));

      setTeams(teams);
    } catch (error: any) {
      setError(`fetchTeams: ${error.message}`);
      console.error(error);
    }
  };

  const associateReposToTeam = async () => {
    try {
      setError(null);

      if (!selectedTeam) {
        console.log("Please select a team.");
        return;
      }

      const associationData = {
        team_slug: selectedTeam,
        repo_names: selectedRepos.map(
          (repoId) => repositories.find((repo) => repo.id === repoId)?.name
        ),
      };
    } catch (error: any) {
      setError(`associateReposToTeam: ${error.message}`);
      console.error("Error associating repositories:", error);
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

  const handleTeamChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newSelectedTeam = e.target.value;
    setSelectedTeam(newSelectedTeam);
    localStorage.setItem("selectedTeam", newSelectedTeam); // Update localStorage
  };

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFilter = e.target.value;
    // setFilter(newFilter);
    setGlobalFilter(newFilter);
  };

  const columns: Column<Repository>[] = useMemo(
    () => [
      {
        id: "selection",
        Header: ({ getToggleAllRowsSelectedProps }) => (
          <div>
            <IndeterminateCheckbox
              {...getToggleAllRowsSelectedProps()}
              key={`htoggle`}
            />
          </div>
        ),
        Cell: ({ row }) => (
          <div>
            <IndeterminateCheckbox
              {...row.getToggleRowSelectedProps()}
              key={`r${row.id}-ctoggle`}
            />
          </div>
        ),
      },
      {
        id: "Repository",
        Header: "Repository",
        accessor: "name",
      },
      {
        id: "Language",
        Header: "Language",
        accessor: "language",
      },
      {
        id: "Created",
        Header: "Created",
        accessor: "created",
        sortingFn: "datetime",
        Cell: ({ value }) => new Date(value).toLocaleDateString(),
      },
      {
        id: "Updated",
        Header: "Updated",
        accessor: "updated",
        sortingFn: "datetime",
        Cell: ({ value }) => new Date(value).toLocaleDateString(),
      },
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    visibleColumns,
    setGlobalFilter,
    state: { selectedRowIds, globalFilter },
  } = useTable(
    { columns, data: repositories },
    useGlobalFilter,
    useSortBy,
    useRowSelect
  );

  const sortedRows = useMemo(() => {
    const selectedRows = rows.filter((row) =>
      selectedRowIds.hasOwnProperty(row.id)
    );
    const unselectedRows = rows.filter(
      (row) => !selectedRowIds.hasOwnProperty(row.id)
    );
    return [...selectedRows, ...unselectedRows];
  }, [selectedRowIds, rows]);

  return (
    <div className={`${styles.container} mb-6 mt-6`}>
      <h1>GitHub Repository Manager</h1>
      <div className="rounded overflow-hidden shadow-lg border-2 border-gray-200 m-4">
        <div className="m-4">
          <label>
            Personal Access Token:
            <input
              title="token"
              type="text"
              value={token}
              onChange={handleTokenChange}
              className={`${styles["input-field"]} w-full`}
            />
          </label>
        </div>
        <div className="m-4">
          <label>
            Organization:
            <input
              title="organization"
              type="text"
              value={organization}
              onChange={handleOrganizationChange}
              className={`${styles["input-field"]} w-full`}
            />
          </label>
        </div>
        {!error ? (
          <></>
        ) : (
          <div className="m-4">
            <label>
              Erreur:
              <p>{error}</p>
            </label>
          </div>
        )}
      </div>
      <div className="m-4">
        {!teams || teams.length <= 0 ? (
          <></>
        ) : (
          <>
            <div className="m-4">
              <label>
                Select a Team:
                <select
                  title="team"
                  value={selectedTeam}
                  onChange={handleTeamChange}
                  className={`${styles["select-field"]} w-full`}
                >
                  <option value="">Select</option>
                  {teams.map((team: any) => (
                    <option key={team.id} value={team.slug}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="m-4">
              {!selectedTeam ? (
                <></>
              ) : (
                <>
                  <label>
                    Select some repositories to associate to {selectedTeam}:
                  </label>
                  <table
                    {...getTableProps()}
                    className={`${styles["custom-table"]} border border-collapse w-full`}
                  >
                    <thead>
                      {headerGroups.map((headerGroup) => (
                        <tr
                          {...headerGroup.getHeaderGroupProps()}
                          id={`hg${headerGroup.id}`}
                          key={`hg${headerGroup.id}`}
                          className={`${styles["header-row"]} bg-gray-200`}
                        >
                          {headerGroup.headers.map((column) => (
                            <th
                              {...column.getHeaderProps(
                                column.canSort
                                  ? column.getSortByToggleProps()
                                  : undefined
                              )}
                              id={`hg${headerGroup.id}-h${column.id}`}
                              key={`hg${headerGroup.id}-h${column.id}`}
                              className="px-4 py-2 text-left"
                            >
                              {column.render("Header")}
                              {column.canSort ? (
                                <span
                                  className={`${styles["column-sorting-indicator"]}`}
                                >
                                  {column.isSorted
                                    ? column.isSortedDesc
                                      ? "▼"
                                      : "▲"
                                    : "▲▼"}
                                </span>
                              ) : (
                                <></>
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                      <tr id="filter" key="filter">
                        <th
                          id="filter2"
                          key="filter2"
                          colSpan={visibleColumns.length}
                          className={`${styles["header-filter"]} px-4 py-2 text-left bg-black`}
                        >
                          <div>
                            <input
                              value={globalFilter}
                              placeholder="Type to search..."
                              title="filter"
                              onChange={handleFilterChange}
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody {...getTableBodyProps()}>
                      {sortedRows.map((row) => {
                        prepareRow(row);
                        return (
                          <tr
                            {...row.getRowProps()}
                            id={`r${row.id}`}
                            key={`r${row.id}`}
                          >
                            {row.cells.map((cell) => {
                              return (
                                <td
                                  {...cell.getCellProps()}
                                  id={`r${row.id}-c${cell.column.id}`}
                                  key={`r${row.id}-c${cell.column.id}`}
                                  className="px-4 py-2 border-t"
                                >
                                  {cell.render("Cell")}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan={5} className="p-0">
                          <div>
                            <p className="text-center">
                              Selected Rows:{" "}
                              {Object.keys(selectedRowIds).length} /{" "}
                              {Object.keys(rows).length}
                            </p>
                            <button
                              type="button"
                              disabled={Object.keys(selectedRowIds).length <= 0}
                              onClick={associateReposToTeam}
                              className={`px-4 py-2 w-full ${
                                Object.keys(selectedRowIds).length <= 0
                                  ? "bg-gray-500"
                                  : "bg-blue-500"
                              }  text-white`}
                            >
                              {Object.keys(selectedRowIds).length <= 0
                                ? "Select some repos"
                                : `Associate ${
                                    Object.keys(selectedRowIds).length
                                  } / 
                                   ${Object.keys(repositories).length} repos`}
                            </button>
                          </div>
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
