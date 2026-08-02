/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApplicationPreferences, Session, TorrentFilePriority, TorrentPieceState } from "./rpc-types";
import { MOCK_SESSION, MOCK_STATS, MOCK_TORRENTS } from "./mock-data";

const MOCK_APPLICATION_PREFERENCES: ApplicationPreferences = {
  locale: "zh_CN",
  save_path: "/srv/downloads",
  temp_path_enabled: true,
  temp_path: "/srv/downloads/incomplete",
  create_subfolder_enabled: false,
  start_paused_enabled: false,
  preallocate_all: false,
  incomplete_files_ext: true,
  auto_tmm_enabled: false,
  export_dir: "",
  export_dir_fin: "",
  queueing_enabled: true,
  max_active_downloads: 5,
  max_active_uploads: 8,
  max_active_torrents: 12,
  dont_count_slow_torrents: true,
  max_ratio_enabled: false,
  max_ratio: -1,
  max_seeding_time_enabled: false,
  max_seeding_time: -1,
  listen_port: 6881,
  upnp: true,
  random_port: false,
  dl_limit: 0,
  up_limit: 0,
  alt_dl_limit: 10240,
  alt_up_limit: 1024,
  scheduler_enabled: false,
  dht: true,
  pex: true,
  lsd: true,
  encryption: 0,
  anonymous_mode: false,
  proxy_type: -1,
  proxy_ip: "",
  proxy_port: 8080,
  proxy_auth_enabled: false,
  proxy_username: "",
  proxy_password: "",
  ip_filter_enabled: false,
  ip_filter_path: "",
  web_ui_address: "*",
  web_ui_port: 8080,
  web_ui_username: "admin",
  web_ui_password: "",
  web_ui_csrf_protection_enabled: true,
  web_ui_clickjacking_protection_enabled: true,
  web_ui_session_timeout: 3600,
  alternative_webui_enabled: true,
  alternative_webui_path: "/webui",
  use_https: false,
  rss_processing_enabled: true,
  rss_refresh_interval: 30,
  rss_max_articles_per_feed: 50,
  mail_notification_enabled: false,
  autorun_enabled: false,
  autorun_program: "",
  add_trackers_enabled: false,
  add_trackers: "",
  scan_dirs: {},
  banned_IPs: "",
  async_io_threads: 10,
};

class QBittorrentRPCMock {
  private applicationPreferences: ApplicationPreferences = { ...MOCK_APPLICATION_PREFERENCES };

  constructor() {
    console.log("qBittorrent API mock initialized");
  }

  async checkAuthentication() { return true; }
  async login(_username: string, _password: string) {
    void _username;
    void _password;
    return;
  }
  async logout() { return; }

  async request<T = any>(method: string, args?: any): Promise<T> {
    console.log(`[RPC Mock] Request: ${method}`, args);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    switch (method) {
      case "torrent-get":
        return { torrents: MOCK_TORRENTS } as any;
      case "session-get":
        return MOCK_SESSION as any;
      case "session-stats":
        return MOCK_STATS as any;
      case "session-set":
      case "torrent-start":
      case "torrent-stop":
      case "torrent-remove":
      case "torrent-add":
      case "torrent-set":
      case "torrent-set-location":
      case "torrent-rename-path":
        return {} as any;
      case "free-space":
        return { 
          path: args.path, 
          "size-bytes": 500 * 1024 * 1024 * 1024,
          total_size: 1024 * 1024 * 1024 * 1024 
        } as any; // 500GB free / 1TB total
      case "port-test":
        return { "port-is-open": true } as any;
      default:
        throw new Error(`RPC Method ${method} not implemented in mock`);
    }
  }

  async getTorrents(_fields: string[], _ids?: string[]) {
    return this.request("torrent-get", { ids: _ids });
  }

  async getSession() {
    return this.request("session-get");
  }

  async getApplicationPreferences(): Promise<ApplicationPreferences> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return { ...this.applicationPreferences };
  }

  async setApplicationPreferences(preferences: Partial<ApplicationPreferences>): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 150));
    Object.entries(preferences).forEach(([key, value]) => {
      if (value !== undefined) this.applicationPreferences[key] = value;
    });
  }

  async setSession(args: Partial<Session>) {
    return this.request("session-set", args);
  }

  async getStats() {
    return this.request("session-stats");
  }

  async startTorrents(ids?: string[]) {
    return this.request("torrent-start", { ids });
  }

  async stopTorrents(ids?: string[]) {
    return this.request("torrent-stop", { ids });
  }

  async removeTorrents(ids: string[], deleteData = false) {
    return this.request("torrent-remove", { ids, "delete-local-data": deleteData });
  }

  async addTorrent(args: { 
    filename?: string; 
    metainfo?: string; 
    "download-dir"?: string; 
    paused?: boolean 
  }) {
    return this.request("torrent-add", args);
  }

  async setTorrent(ids: string[], args: any) {
    return this.request("torrent-set", { ids, ...args });
  }

  async setFilePriority(id: string, fileIds: number[], priority: TorrentFilePriority) {
    const torrent = MOCK_TORRENTS.find((item) => item.id === id || item.hashString === id);
    torrent?.files?.forEach((file) => {
      if (fileIds.includes(file.index)) file.priority = priority;
    });
    return {};
  }

  async getTorrentPieceStates(id: string): Promise<TorrentPieceState[]> {
    const torrent = MOCK_TORRENTS.find((item) => item.id === id || item.hashString === id);
    const pieceCount = Math.min(2048, Math.max(256, torrent?.piecesCount ?? 768));
    const completed = Math.round(pieceCount * (torrent?.percentDone ?? 0));
    return Array.from({ length: pieceCount }, (_, index) => index < completed ? 2 : index < completed + 8 ? 1 : 0);
  }

  async setTorrentLocation(ids: string[], location: string, move: boolean = true) {
    return this.request("torrent-set-location", { ids, location, move });
  }

  async renameTorrentPath(id: string, path: string, name: string) {
    return this.request("torrent-rename-path", { ids: [id], path, name });
  }

  async freeSpace(path: string) {
    return this.request("free-space", { path });
  }
  
  async portTest() {
    return this.request<{ "port-is-open": boolean }>("port-test");
  }
}

export const rpc = new QBittorrentRPCMock();
