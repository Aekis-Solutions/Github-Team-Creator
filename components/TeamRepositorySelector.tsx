import React, {
  CSSProperties,
  FC,
  ChangeEvent,
  useMemo,
  useEffect,
  useState,
  MouseEvent,
} from "react";
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
  RowSelection,
} from "@tanstack/react-table";
import { Repository } from "@/app/models/Repository";
import IndeterminateCheckbox from "@/components/IndeterminateCheckbox";
import { Team } from "@/app/models/Team";

import "tailwindcss/tailwind.css";
import styles from "@/app/styles.module.css";

interface TeamRepositorySelectorProps {
  team: Team | undefined;
  repositories: Repository[];
  updateTeam: (
    team: Team,
    repositoryToDisassociate: string[],
    repositoryToAssociate: string[]
  ) => Promise<void>;
}

const TeamRepositorySelector: FC<TeamRepositorySelectorProps> = ({
  team,
  repositories,
  updateTeam,
}) => {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [updatingTeam, setUpdatingTeam] = useState<boolean>(false);

  const [repositoriesToAssociate, setRepositoriesToAssociate] = useState<
    string[]
  >([]);
  const [repositoriesToDisassociate, setRepositoriesToDisassociate] = useState<
    string[]
  >([]);

  const columnHelper = createColumnHelper<Repository>();

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newFilter = e.target.value ?? "";
    setGlobalFilter(newFilter);
  };

  const handleUpdateButton = async (e: MouseEvent<HTMLButtonElement>) => {
    if (team) {
      setUpdatingTeam(true);
      try {
        await updateTeam(
          team,
          repositoriesToDisassociate,
          repositoriesToAssociate
        );
      } catch (error) {
        console.log(error);
      } finally {
        setUpdatingTeam(false);
      }
    }
  };

  const columns = useMemo<ColumnDef<Repository, any>[]>(
    () => [
      columnHelper.display({
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
      }),
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

          const cellStyle: CSSProperties = {
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
      sorting: [],
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    enableRowSelection: true, //enable row selection for all rows
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const sortedRows = useMemo(() => {
    // const selectedRows = table
    //   .getRowModel()
    //   .rows.filter((row) => rowSelection.hasOwnProperty(row.id));
    // const unselectedRows = table
    //   .getRowModel()
    //   .rows.filter((row) => !rowSelection.hasOwnProperty(row.id));

    // return [...selectedRows, ...unselectedRows];
    return table.getRowModel().rows;
  }, [rowSelection, globalFilter]);

  useEffect(() => {
    if (team) {
      const oldRepositoryIds = team.repositories.ids;
      const newRepositoryIds = table
        .getCoreRowModel()
        .flatRows.filter((r) =>
          Object.keys(rowSelection).includes(r.index.toString())
        )
        .map((r) => r.original.id);

      const repositoriesToDisassociate: string[] = [];
      oldRepositoryIds.forEach((repositoryId) => {
        if (!newRepositoryIds.includes(repositoryId)) {
          repositoriesToDisassociate.push(repositoryId);
        }
      });
      setRepositoriesToDisassociate(repositoriesToDisassociate);

      const repositoriesToAssociate: string[] = [];
      newRepositoryIds.forEach((repositoryId) => {
        if (!oldRepositoryIds.includes(repositoryId)) {
          repositoriesToAssociate.push(repositoryId);
        }
      });
      setRepositoriesToAssociate(repositoriesToAssociate);
    }
  }, [rowSelection]);

  useEffect(() => {
    if (team) {
      let _rowSelection: RowSelectionState = {};
      team.repositories.ids.forEach((id) => {
        const repository = sortedRows.find((r) => r.original.id === id);
        if (repository) _rowSelection[repository.index] = true;
      });

      setRowSelection(_rowSelection);
    }
  }, [team, repositories]);

  return team ? (
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
                          onClick: header.column.getToggleSortingHandler(),
                        }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: " 🔼",
                          desc: " 🔽",
                        }[header.column.getIsSorted() as string] ?? null}
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
                placeholder="Type to search all columns..."
                title="filter"
                onChange={handleFilterChange}
              />
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((row) => {
          {
            /* {table.getRowModel().rows.map((row) => { */
          }
          const text = repositoriesToAssociate.includes(row.original.id)
            ? "+"
            : repositoriesToDisassociate.includes(row.original.id)
            ? "-"
            : " ";
          let tooltip = "";
          let className = "";

          if (text === "+") {
            tooltip = "This repository will be associated";
            className = styles["row-associate"];
          } else if (text === "-") {
            tooltip = "This repository will be disassociated";
            className = styles["row-disassociate"];
          }

          return (
            <tr key={row.id} className={className}>
              {row.getVisibleCells().map((cell) => {
                return (
                  <td key={cell.id} className="px-4 py-2 border-t">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                disabled={
                  repositoriesToAssociate.length +
                    repositoriesToDisassociate.length <=
                    0 || updatingTeam
                }
                onClick={handleUpdateButton}
                className={`px-4 py-2 w-full ${
                  repositoriesToAssociate.length +
                    repositoriesToDisassociate.length <=
                  0
                    ? "bg-gray-500"
                    : "bg-blue-500"
                }  text-white`}
              >
                {updatingTeam
                  ? "Updating..."
                  : `${Object.keys(rowSelection).length}/${
                      repositories.length
                    } repos (-${repositoriesToDisassociate.length} +${
                      repositoriesToAssociate.length
                    })`}
              </button>
            </div>
          </th>
        </tr>
      </tfoot>
    </table>
  ) : (
    <></>
  );
};

export default TeamRepositorySelector;
