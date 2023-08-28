"use client";

import { useState, useEffect, useMemo, ChangeEvent } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnDef,
  createColumnHelper,
  flexRender,
  RowSelectionState,
  FiltersTableState,
} from "@tanstack/react-table";
import "tailwindcss/tailwind.css";
import styles from "./styles.module.css";

import { GithubService } from "./services/GithubService";
import { Repository } from "./models/Repository";
import { User } from "./models/User";
import { Team } from "./models/Team";
import IndeterminateCheckbox from "@/components/IndeterminateCheckbox";

export default function Home() {
  const [token, setToken] = useState<string>("");
  const [organization, setOrganization] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<User>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [loadingCurrentUser, setLoadingCurrentUser] = useState<boolean>(false);
  const [loadingRepositories, setLoadingRepositories] =
    useState<boolean>(false);
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const githubService = new GithubService();

  const initializeStore = () => {
    setToken(localStorage.getItem("token") || "");
    setOrganization(localStorage.getItem("organization") || "");
  };

  const fetchCurrentUser = async () => {
    setError(null);
    setLoadingCurrentUser(true);

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

  const updateSelectedTeam = async () => {
    try {
      setError(null);

      if (!selectedTeam) {
        console.log("Please select a team.");
        return;
      }

      console.log(JSON.stringify(rowSelection));
      //await githubService.updateTeam(token, selectedTeam, rowSelection);
    } catch (error: any) {
      setError(`updateTeam: ${error.message}`);
      console.error(error);
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
  };

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFilter = e.target.value ?? "";
    setGlobalFilter(newFilter);
  };

  const columnHelper = createColumnHelper<Repository>();

  const columns = useMemo<ColumnDef<Repository, any>[]>(
    () => [
      {
        id: "selection",
        header: ({ table }) => (
          <IndeterminateCheckbox
            {...{
              checked: table.getIsAllRowsSelected(),
              indeterminate: table.getIsSomeRowsSelected(),
              onChange: table.getToggleAllRowsSelectedHandler(),
            }}
          />
        ),
        cell: ({ row }) => (
          <div className="px-1">
            <IndeterminateCheckbox
              {...{
                checked: row.getIsSelected(),
                disabled: !row.getCanSelect(),
                indeterminate: row.getIsSomeSelected(),
                onChange: row.getToggleSelectedHandler(),
              }}
            />
          </div>
        ),
      },
      columnHelper.accessor((row) => row.name, {
        id: "Repository",
        header: "Repository",
        footer: (props) => props.column.id,
      }),
      columnHelper.accessor((row) => row.primaryLanguage?.name ?? "N/A", {
        id: "Language",
        header: "Language",
        footer: (props) => props.column.id,
      }),
      columnHelper.accessor((row) => row.created, {
        id: "Created",
        header: "Created",
        sortingFn: "datetime",
        cell: (info) => new Date(info.getValue()).toLocaleDateString(),
        footer: (props) => props.column.id,
      }),
      columnHelper.accessor((row) => row.pushed, {
        id: "Pushed",
        header: "Pushed",
        sortingFn: "datetime",
        cell: (info) => {
          const date = new Date(info.getValue());
          const currentDate = new Date();
          const timeDifference = currentDate.getTime() - date.getTime();
          const monthsDifference = timeDifference / (1000 * 60 * 60 * 24 * 30);

          let color = "black";
          let tooltip = "";

          if (monthsDifference <= 18) {
            color = "white";
            tooltip = "Recent project, last pushed in the last 18 months";
          } else if (monthsDifference <= 36) {
            color = "orange";
            tooltip =
              "Old project, last pushed between 18 months and 3 years ago";
          } else {
            color = "red";
            tooltip = "Obsolete project, last pushed more than 3 years ago";
          }

          const cellStyle = {
            color: color,
            cursor: "pointer", // Add cursor pointer to indicate the tooltip
            position: "relative", // Add relative position for tooltip positioning
          };

          return (
            <span style={cellStyle} title={tooltip}>
              {date.toLocaleDateString()}
            </span>
          );
        },
        footer: (props) => props.column.id,
      }),
    ],
    []
  );

  const table = useReactTable({
    columns,
    data: repositories,
    state: {
      sorting,
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    enableRowSelection: true, //enable row selection for all rows
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    debugTable: true,
  });

  const sortedRows = useMemo(() => {
    const selectedRows = table
      .getRowModel()
      .rows.filter((row) => rowSelection.hasOwnProperty(row.id));
    const unselectedRows = table
      .getRowModel()
      .rows.filter((row) => !rowSelection.hasOwnProperty(row.id));

    return [...selectedRows, ...unselectedRows];
  }, [rowSelection, table.getRowModel().rows]);

  useEffect(() => {
    initializeStore();

    if (token && organization) {
      fetchCurrentUser();
      fetchTeams();
    }
  }, [token, organization]);

  useEffect(() => {
    const fetchData = async () => {
      localStorage.setItem("selectedTeam", selectedTeam);
      if (selectedTeam === "") return;

      await fetchRepositories();

      const team = teams.find((t) => t.name === selectedTeam);
      if (team) {
        let _rowSelection: RowSelectionState = {};
        team.repositories.ids.forEach((idObject) => {
          const repository = sortedRows.find(
            (r) => r.original.id === idObject.id
          );
          if (repository) _rowSelection[repository.index] = true;
        });
        setRowSelection(_rowSelection);
      }
    };

    fetchData();
  }, [selectedTeam]);

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
              {loadingTeams ? (
                "Loading teams..."
              ) : (
                <label>
                  Select a Team:
                  <select
                    title="team"
                    value={selectedTeam}
                    onChange={handleTeamChange}
                    className={`${styles["select-field"]} w-full`}
                  >
                    <option value="">Select</option>
                    {teams.map((team: Team) => (
                      <option key={team.id} value={team.name}>
                        {team.name} ({team.repositories.ids.length})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="m-4">
              {loadingRepositories ? (
                "Loading repositories..."
              ) : selectedTeam ? (
                <>
                  <label>
                    Select some repositories to associate to {selectedTeam}:
                  </label>
                  <table
                    className={`${styles["custom-table"]} border border-collapse w-full`}
                  >
                    <thead>
                      {table.getHeaderGroups().map((headerGroup) => {
                        return (
                          <tr
                            key={headerGroup.id}
                            className={`${styles["header-row"]} bg-gray-200`}
                          >
                            {headerGroup.headers.map((header) => {
                              return (
                                <th
                                  key={header.id}
                                  colSpan={header.colSpan}
                                  className={`px-4 py-2 text-left`}
                                >
                                  {header.isPlaceholder ? null : (
                                    <div
                                      {...{
                                        className: header.column.getCanSort()
                                          ? "cursor-pointer select-none"
                                          : "",
                                        onClick:
                                          header.column.getToggleSortingHandler(),
                                      }}
                                    >
                                      {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                      )}
                                      {{
                                        asc: " 🔼",
                                        desc: " 🔽",
                                      }[
                                        header.column.getIsSorted() as string
                                      ] ?? null}
                                    </div>
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        );
                      })}
                      <tr id="filter" key="filter">
                        <th
                          id="filter2"
                          key="filter2"
                          colSpan={table.getVisibleFlatColumns().length}
                          className={`${styles["header-filter"]} px-4 py-2 text-left bg-black`}
                        >
                          <div>
                            <input
                              value={globalFilter ?? ""}
                              placeholder="Type to search..."
                              title="filter"
                              onChange={handleFilterChange}
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((row) => {
                        return (
                          <tr key={row.id}>
                            {row.getVisibleCells().map((cell) => {
                              return (
                                <td
                                  key={cell.id}
                                  className="px-4 py-2 border-t"
                                >
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
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
                            <button
                              type="button"
                              disabled={Object.keys(rowSelection).length <= 0}
                              onClick={updateSelectedTeam}
                              className={`px-4 py-2 w-full ${
                                Object.keys(rowSelection).length <= 0
                                  ? "bg-gray-500"
                                  : "bg-blue-500"
                              }  text-white`}
                            >
                              {Object.keys(rowSelection).length <= 0
                                ? "Select some repos"
                                : `Associate ${
                                    Object.keys(rowSelection).length
                                  } / 
                                   ${Object.keys(repositories).length} repos`}
                            </button>
                          </div>
                        </th>
                      </tr>
                    </tfoot>
                  </table>
                </>
              ) : (
                <></>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
