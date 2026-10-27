/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ApplicationPreferences, Session, TorrentFilePriority, TorrentPieceState } from "@/lib/rpc-types";
import { isWritablePreference } from "./application-preferences";
import { MOCK_SESSION, MOCK_STATS, MOCK_TORRENTS } from "@/lib/mock-data";
import { APP_CONFIG } from "./config";


const MOCK_APPLICATION_PREFERENCES: ApplicationPreferences = {
  ...MOCK_SESSION,
  "seed-ratio-limited": true,
  "seed-ratio-limit": 2,
  "idle-seeding-limit-enabled": false,
  "idle-seeding-limit": 30,
  "queue-stalled-enabled": true,
  "queue-stalled-minutes": 30,
  "sequential-download": false,
  "script-torrent-added-enabled": false,
  "script-torrent-added-filename": "",
  "script-torrent-done-enabled": false,
  "script-torrent-done-filename": "",
  "script-torrent-done-seeding-enabled": false,
  "script-torrent-done-seeding-filename": "",
  "cache-size-mib": 4,
  "config-dir": "/config/transmission-daemon",
  "session-id": "mock-session",
};

class TransmissionRPCMock {
  private applicationPreferences: ApplicationPreferences = { ...MOCK_APPLICATION_PREFERENCES };

  constructor() {
    console.log("Transmission RPC 模拟服务已初始化");
  }

  async checkAuthentication() { return true; }
  async login(_username: string, _password: string) {
    void _username;
    void _password;
    return;
  }
  async logout() { window.dispatchEvent(new Event(APP_CONFIG.events.authLogout)); }

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
      case "torrent-verify":
      case "torrent-reannounce":
      case "torrent-start-now":
      case "queue-move-top":
      case "queue-move-up":
      case "queue-move-down":
      case "queue-move-bottom":
        return {} as any;
      default:
        throw new Error(`RPC Method ${method} not implemented in mock`);
    }
  }

  async getTorrents(_fields: string[], _ids?: string[]) {
    return this.request("torrent-get", { ids: _ids });
  }

  async getTorrentPieceStates(id: string): Promise<TorrentPieceState[]> {
    const torrent = MOCK_TORRENTS.find((item) => item.id === id || item.hashString === id);
    const pieceCount = Math.min(2048, Math.max(256, torrent?.piecesCount ?? 768));
    const completed = Math.round(pieceCount * (torrent?.percentDone ?? 0));
    return Array.from({ length: pieceCount }, (_, index) => index < completed ? 2 : 0);
  }

  async getSession() {
    return this.request("session-get");
  }

  async getTorrentCategories(): Promise<Array<{ name: string; savePath: string }>> {
    return [];
  }

  async getTorrentTags(): Promise<string[]> {
    return [];
  }

  async getApplicationPreferences(): Promise<ApplicationPreferences> {
    await new Promise(resolve => setTimeout(resolve, 150));
    return { ...this.applicationPreferences };
  }

  async setApplicationPreferences(preferences: Partial<ApplicationPreferences>): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 150));
    Object.entries(preferences).forEach(([key, value]) => {
      if (value !== undefined && isWritablePreference(key)) this.applicationPreferences[key] = value;
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

  async verifyTorrents(ids?: string[]) {
    return this.request("torrent-verify", { ids });
  }

  async reannounceTorrents(ids?: string[]) {
    return this.request("torrent-reannounce", { ids });
  }

  async setForceStart(ids: string[], value: boolean) {
    return this.request(value ? "torrent-start-now" : "torrent-start", { ids });
  }

  // Unsupported by Transmission; hidden through APP_CONFIG.capabilities, same errors as the real client.
  async toggleSequentialDownload(ids: string[]): Promise<never> { void ids; throw new Error("Transmission 当前版本不支持顺序下载开关"); }
  async toggleFirstLastPiecePriority(ids: string[]): Promise<never> { void ids; throw new Error("Transmission 不支持首尾区块优先开关"); }
  async setSuperSeeding(ids: string[], value: boolean): Promise<never> { void ids; void value; throw new Error("Transmission 不支持超级做种"); }
  async setAutoManagement(ids: string[], value: boolean): Promise<never> { void ids; void value; throw new Error("Transmission 不支持自动种子管理"); }

  async changeQueuePriority(ids: string[], direction: "top" | "up" | "down" | "bottom") {
    return this.request(`queue-move-${direction}`, { ids });
  }

  async setTorrentSavePath(ids: string[], path: string) {
    return this.setTorrentLocation(ids, path, true);
  }

  async setTorrentDownloadPath(ids: string[], path: string) {
    void ids;
    if (path) throw new Error("Transmission 只支持统一的数据位置，请使用保存路径");
    return {};
  }

  async exportTorrent(id: string): Promise<{ blob: Blob }> {
    return { blob: new Blob([`d4:infod4:name${id.length}:${id}ee`], { type: "application/x-bittorrent" }) };
  }
}

export const rpc = new TransmissionRPCMock();
