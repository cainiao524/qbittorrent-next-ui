import { FileArchive } from "lucide-react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n-context"
import { TorrentCreatorDialog } from "./components/torrent-creator-dialog"

/** Backend-only entries for the toolbar's tools menu. */
export function BackendToolbarTools() {
  const { t } = useI18n()
  return (
    <TorrentCreatorDialog>
      <DropdownMenuItem
        className="rounded-xl py-2.5 px-3 focus:bg-muted cursor-pointer transition-colors"
        onSelect={(event) => event.preventDefault()}
      >
        <FileArchive className="h-4 w-4 mr-3 text-primary opacity-70" />
        <span className="text-sm font-medium whitespace-nowrap">{t('creator.title', 'Torrent Creator')}</span>
      </DropdownMenuItem>
    </TorrentCreatorDialog>
  )
}
