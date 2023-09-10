import { FC, ChangeEvent } from "react";
import "tailwindcss/tailwind.css";
import styles from "@/app/styles.module.css";

type GithubConnectionPanelProps = {
  token: string;
  organization: string;
  error: string | null;
  onTokenChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onOrganizationChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const GithubConnectionPanel: FC<GithubConnectionPanelProps> = ({
  token,
  organization,
  error,
  onTokenChange,
  onOrganizationChange,
}) => {
  return (
    <div className="rounded overflow-hidden shadow-lg border-2 border-gray-200 m-4">
      <div className="m-4">
        <label>
          Personal Access Token:
          <input
            title="token"
            type="text"
            value={token}
            onChange={onTokenChange}
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
            onChange={onOrganizationChange}
            className={`${styles["input-field"]} w-full`}
          />
        </label>
      </div>
      {error ? (
        <div className="m-4">
          <label>
            Erreur:
            <p>{error}</p>
          </label>
        </div>
      ) : null}
    </div>
  );
};

export default GithubConnectionPanel;
