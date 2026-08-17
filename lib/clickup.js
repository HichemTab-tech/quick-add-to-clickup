const DEFAULT_BASE_URL = "https://api.clickup.com/api/v2";

export class ClickUpError extends Error {
  constructor(message, { status = 0, code = "", details = null } = {}) {
    super(message);
    this.name = "ClickUpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ClickUpClient {
  constructor(token, { fetchImpl = globalThis.fetch, baseUrl = DEFAULT_BASE_URL } = {}) {
    if (!token?.trim()) throw new ClickUpError("A ClickUp API token is required.");
    this.token = token.trim();
    this.fetch = fetchImpl;
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request(path, { method = "GET", body } = {}) {
    let response;
    try {
      response = await this.fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: this.token,
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      throw new ClickUpError("Could not reach ClickUp. Check your internet connection.", {
        details: error,
      });
    }

    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        data = raw;
      }
    }

    if (!response.ok) {
      const message = data?.err || data?.message || `ClickUp returned HTTP ${response.status}.`;
      throw new ClickUpError(message, {
        status: response.status,
        code: data?.ECODE || data?.code || "",
        details: data,
      });
    }

    return data;
  }

  getCurrentUser() {
    return this.request("/user");
  }

  getWorkspaces() {
    return this.request("/team");
  }

  getSpaces(workspaceId) {
    return this.request(`/team/${encodeURIComponent(workspaceId)}/space?archived=false`);
  }

  getFolders(spaceId) {
    return this.request(`/space/${encodeURIComponent(spaceId)}/folder?archived=false`);
  }

  getFolderlessLists(spaceId) {
    return this.request(`/space/${encodeURIComponent(spaceId)}/list?archived=false`);
  }

  getLists(folderId) {
    return this.request(`/folder/${encodeURIComponent(folderId)}/list?archived=false`);
  }

  async discoverLists() {
    const workspaceData = await this.getWorkspaces();
    const lists = [];

    for (const workspace of workspaceData?.teams ?? []) {
      const spaceData = await this.getSpaces(workspace.id);
      for (const space of spaceData?.spaces ?? []) {
        const [folderData, folderlessData] = await Promise.all([
          this.getFolders(space.id),
          this.getFolderlessLists(space.id),
        ]);

        for (const folder of folderData?.folders ?? []) {
          const folderLists = Array.isArray(folder.lists)
            ? folder.lists
            : (await this.getLists(folder.id))?.lists ?? [];
          for (const list of folderLists) {
            lists.push({
              id: String(list.id),
              name: list.name,
              folder: folder.name,
              space: space.name,
              workspace: workspace.name,
            });
          }
        }

        for (const list of folderlessData?.lists ?? []) {
          lists.push({
            id: String(list.id),
            name: list.name,
            folder: "",
            space: space.name,
            workspace: workspace.name,
          });
        }
      }
    }

    return lists.sort((a, b) =>
      [a.workspace, a.space, a.folder, a.name]
        .join("/")
        .localeCompare([b.workspace, b.space, b.folder, b.name].join("/")),
    );
  }

  createTask(listId, task) {
    if (!String(listId ?? "").trim()) {
      throw new ClickUpError("Choose a destination list before creating a task.");
    }
    return this.request(`/list/${encodeURIComponent(listId)}/task`, {
      method: "POST",
      body: task,
    });
  }
}
