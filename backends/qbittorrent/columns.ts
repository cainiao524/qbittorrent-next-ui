
export interface ColumnConfig {
  id: string
  labelKey: string
  defaultLabel: string
  width: string
  minWidth?: string
  rpcFields: string[]
  align?: "left" | "right" | "center"
}

export const TORRENT_COLUMNS: ColumnConfig[] = [
  {
    id: "name",
    labelKey: "common.name",
    defaultLabel: "Name",
    width: "30%",
    minWidth: "250px",
    rpcFields: ["name"],
    align: "left"
  },
  {
    id: "status",
    labelKey: "common.status",
    defaultLabel: "Status",
    width: "160px",
    rpcFields: ["status", "error", "errorString"],
    align: "left"
  },
  {
    id: "progress",
    labelKey: "common.progress",
    defaultLabel: "Progress",
    width: "210px",
    minWidth: "190px",
    rpcFields: ["percentDone", "size", "totalSize"],
    align: "left"
  },
  {
    id: "size",
    labelKey: "common.selected_size",
    defaultLabel: "Selected Size",
    width: "100px",
    rpcFields: ["size"],
    align: "right"
  },
  {
    id: "totalSize",
    labelKey: "common.total_size",
    defaultLabel: "Total Size",
    width: "110px",
    rpcFields: ["totalSize"],
    align: "right"
  },
  {
    id: "addedDate",
    labelKey: "common.added_date",
    defaultLabel: "Added Date",
    width: "160px",
    rpcFields: ["addedDate"],
    align: "right"
  },
  {
    id: "editDate",
    labelKey: "common.last_activity",
    defaultLabel: "Last Activity",
    width: "160px",
    rpcFields: ["editDate"],
    align: "right"
  },
  {
    id: "uploadedEver",
    labelKey: "details.total_uploaded",
    defaultLabel: "Uploaded",
    width: "110px",
    rpcFields: ["uploadedEver"],
    align: "right"
  },
  {
    id: "uploadRatio",
    labelKey: "details.share_ratio",
    defaultLabel: "Ratio",
    width: "80px",
    rpcFields: ["uploadRatio"],
    align: "right"
  },
  {
    id: "rateDownload",
    labelKey: "common.down_speed",
    defaultLabel: "Down Speed",
    width: "110px",
    rpcFields: ["rateDownload"],
    align: "right"
  },
  {
    id: "rateUpload",
    labelKey: "common.up_speed",
    defaultLabel: "Up Speed",
    width: "110px",
    rpcFields: ["rateUpload"],
    align: "right"
  },
  {
    id: "eta",
    labelKey: "common.eta",
    defaultLabel: "ETA",
    width: "100px",
    rpcFields: ["eta"],
    align: "right"
  },
  {
    id: "seeds",
    labelKey: "common.seeds",
    defaultLabel: "Seeds",
    width: "100px",
    rpcFields: ["peersSendingToUs", "seedsTotal"],
    align: "right"
  },
  {
    id: "peers",
    labelKey: "common.peers",
    defaultLabel: "Peers",
    width: "100px",
    rpcFields: ["peersGettingFromUs", "peersTotal"],
    align: "right"
  },
  {
    id: "category",
    labelKey: "common.category",
    defaultLabel: "Category",
    width: "140px",
    rpcFields: ["category"],
    align: "left"
  },
  {
    id: "labels",
    labelKey: "common.tags",
    defaultLabel: "Tags",
    width: "180px",
    rpcFields: ["labels"],
    align: "left"
  },
  {
    id: "dateCreated",
    labelKey: "common.created_on",
    defaultLabel: "Created On",
    width: "160px",
    rpcFields: ["dateCreated"],
    align: "right"
  },
  {
    id: "timeElapsed",
    labelKey: "common.time_active",
    defaultLabel: "Time Active",
    width: "130px",
    rpcFields: ["timeElapsed"],
    align: "right"
  },
  {
    id: "lastSeenComplete",
    labelKey: "common.last_seen_complete",
    defaultLabel: "Last Seen Complete",
    width: "180px",
    rpcFields: ["lastSeenComplete"],
    align: "right"
  },
  {
    id: "availability",
    labelKey: "common.availability",
    defaultLabel: "Availability",
    width: "110px",
    rpcFields: ["availability"],
    align: "right"
  },
  {
    id: "tracker",
    labelKey: "common.tracker",
    defaultLabel: "Tracker",
    width: "220px",
    rpcFields: ["trackerStats"],
    align: "left"
  },
  {
    id: "downloadedEver",
    labelKey: "common.downloaded",
    defaultLabel: "Downloaded",
    width: "120px",
    rpcFields: ["downloadedEver"],
    align: "right"
  },
  {
    id: "amountLeft",
    labelKey: "common.remaining",
    defaultLabel: "Remaining",
    width: "120px",
    rpcFields: ["amountLeft"],
    align: "right"
  },
  {
    id: "doneDate",
    labelKey: "common.completed_on",
    defaultLabel: "Completed On",
    width: "160px",
    rpcFields: ["doneDate"],
    align: "right"
  },
  {
    id: "downloadLimit",
    labelKey: "common.download_limit_column",
    defaultLabel: "Down Limit",
    width: "120px",
    rpcFields: ["downloadLimit", "downloadLimited"],
    align: "right"
  },
  {
    id: "uploadLimit",
    labelKey: "common.upload_limit_column",
    defaultLabel: "Up Limit",
    width: "120px",
    rpcFields: ["uploadLimit", "uploadLimited"],
    align: "right"
  },
  {
    id: "downloadDir",
    labelKey: "common.save_path",
    defaultLabel: "Save Path",
    width: "260px",
    rpcFields: ["downloadDir"],
    align: "left"
  }
]

export const DEFAULT_VISIBLE_COLUMNS = [
  "name",
  "status",
  "progress",
  "size",
  "totalSize",
  "uploadedEver",
  "rateDownload",
  "eta"
]

export const BASE_RPC_FIELDS = [
  "id",
  "name",
  "status",
  "rateDownload",
  "rateUpload",
  "downloadDir",
  "labels",
  "trackerStats",
  "error",
  "errorString",
  "addedDate"
]

export const GRID_MODE_RPC_FIELDS = [
  "totalSize",
  "percentDone",
  "rateDownload",
  "rateUpload",
  "eta"
]

/**
 * Get required RPC fields based on visible columns and view mode
 */
export function getRequiredRpcFields(visibleColumns: string[], viewMode: "list" | "grid"): string[] {
  const fieldSet = new Set(BASE_RPC_FIELDS)

  if (viewMode === "grid") {
    GRID_MODE_RPC_FIELDS.forEach(f => fieldSet.add(f))
  } else {
    visibleColumns.forEach(colId => {
      const config = TORRENT_COLUMNS.find(c => c.id === colId)
      if (config) {
        config.rpcFields.forEach(f => fieldSet.add(f))
      }
    })
  }

  return Array.from(fieldSet)
}
