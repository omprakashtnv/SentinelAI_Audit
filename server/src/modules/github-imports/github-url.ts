import { ApiError } from "../../shared/errors/api-error";

const GITHUB_OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const GITHUB_REPOSITORY_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

export type ParsedGitHubRepositoryUrl = {
  owner: string;
  name: string;
  repositoryUrl: string;
  cloneUrl: string;
};

export function parseGitHubRepositoryUrl(repositoryUrl: string): ParsedGitHubRepositoryUrl {
  let url: URL;

  try {
    url = new URL(repositoryUrl);
  } catch {
    throwInvalidGitHubUrl();
  }

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throwInvalidGitHubUrl();
  }

  const segments = url.pathname.split("/").filter(Boolean);

  if (segments.length !== 2) {
    throwInvalidGitHubUrl();
  }

  const owner = segments[0];
  const rawName = segments[1];
  const name = rawName?.endsWith(".git") ? rawName.slice(0, -4) : rawName;

  if (!owner || !name || !GITHUB_OWNER_PATTERN.test(owner) || !GITHUB_REPOSITORY_PATTERN.test(name)) {
    throwInvalidGitHubUrl();
  }

  const normalizedRepositoryUrl = `https://github.com/${owner}/${name}`;

  return {
    owner,
    name,
    repositoryUrl: normalizedRepositoryUrl,
    cloneUrl: `${normalizedRepositoryUrl}.git`,
  };
}

function throwInvalidGitHubUrl(): never {
  throw new ApiError({
    statusCode: 400,
    code: "INVALID_GITHUB_REPOSITORY_URL",
    message: "Repository URL must be a public GitHub repository HTTPS URL.",
  });
}
