import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { AdminNote } from "@/interface/admin"
import {
  filterAndSortNotes,
  type ExpirationFilter,
  type ProtectionFilter,
  type SortDir,
  type SortKey,
} from "@/lib/adminNotesTable"
import { cn } from "@/lib/utils"
import { formatDateTime, formatRemaining, formatTtlMinutes } from "@/lib/noteTime"

type Column = {
  key: SortKey | null
  label: string
  className?: string
}

const COLUMNS: Column[] = [
  { key: "slug", label: "Slug", className: "min-w-[120px]" },
  { key: "createdAt", label: "Criada" },
  { key: "updatedAt", label: "Última edição" },
  { key: "createdClientIp", label: "IP criação" },
  { key: "lastClientIp", label: "IP última edição" },
  { key: "ttlMinutes", label: "Prazo (TTL)" },
  { key: "expiresAt", label: "Expira em" },
  { key: "remaining", label: "Falta (TTL)" },
  { key: "isProtected", label: "Protegida" },
  { key: "attachmentCount", label: "Anexos" },
  { key: null, label: "Ações" },
]

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

type Props = {
  notes: AdminNote[]
  loading?: boolean
  onEdit: (note: AdminNote) => void
  onDelete: (note: AdminNote) => void
}

export default function AdminNotesTable({ notes, loading, onEdit, onDelete }: Props) {
  const [query, setQuery] = useState("")
  const [protection, setProtection] = useState<ProtectionFilter>("all")
  const [expiration, setExpiration] = useState<ExpirationFilter>("all")
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const filtered = useMemo(
    () =>
      filterAndSortNotes(notes, {
        query,
        protection,
        expiration,
        sortKey,
        sortDir,
      }),
    [notes, query, protection, expiration, sortKey, sortDir]
  )

  const hasFilters =
    query.trim() !== "" || protection !== "all" || expiration !== "all"

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "slug" ? "asc" : "desc")
    }
  }

  const clearFilters = () => {
    setQuery("")
    setProtection("all")
    setExpiration("all")
  }

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
    }
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5" aria-hidden />
    ) : (
      <ArrowDown className="size-3.5" aria-hidden />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[200px] max-w-md space-y-1">
          <label htmlFor="admin-notes-search" className="text-sm font-medium">
            Buscar
          </label>
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              id="admin-notes-search"
              type="search"
              placeholder="Slug, IP, datas, TTL…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-9"
              autoComplete="off"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <FilterSelect
            id="admin-filter-protection"
            label="Proteção"
            value={protection}
            onChange={(v) => setProtection(v as ProtectionFilter)}
            options={[
              ["all", "Todas"],
              ["yes", "Protegidas"],
              ["no", "Abertas"],
            ]}
          />
          <FilterSelect
            id="admin-filter-expiration"
            label="Expiração"
            value={expiration}
            onChange={(v) => setExpiration(v as ExpirationFilter)}
            options={[
              ["all", "Todas"],
              ["none", "Sem expiração"],
              ["active", "Com prazo ativo"],
              ["expired", "Expiradas"],
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {loading && notes.length === 0
            ? "Carregando…"
            : (
              <>
                <span className="font-medium text-foreground">{filtered.length}</span>
                {" de "}
                <span className="font-medium text-foreground">{notes.length}</span>
                {" nota(s)"}
                {hasFilters ? " (filtrado)" : ""}
              </>
            )}
        </span>
        {hasFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-12rem)]">
          <table className="w-full min-w-[1200px] text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80 border-b">
              <tr className="text-left text-muted-foreground">
                {COLUMNS.map((col) =>
                  col.key ? (
                    <th key={col.key} className={cn("py-2.5 px-3 font-medium", col.className)}>
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key!)}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        {col.label}
                        <SortIcon columnKey={col.key} />
                      </button>
                    </th>
                  ) : (
                    <th key="actions" className="py-2.5 px-3 font-medium">
                      {col.label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="py-12 px-3 text-center text-muted-foreground"
                  >
                    {notes.length === 0
                      ? "Nenhuma nota na base."
                      : "Nenhuma nota corresponde aos filtros."}
                  </td>
                </tr>
              ) : (
                filtered.map((note) => (
                  <tr
                    key={note.id}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/40 odd:bg-muted/15"
                  >
                    <td className="py-2 px-3 font-mono">
                      <Link
                        to={`/${note.slug}`}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {note.slug}
                      </Link>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {formatDateTime(note.createdAt)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {formatDateTime(note.updatedAt)}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">
                      {note.createdClientIp ?? "—"}
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">
                      {note.lastClientIp ?? "—"}
                    </td>
                    <td className="py-2 px-3">{formatTtlMinutes(note.ttlMinutes)}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {formatDateTime(note.expiresAt)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {note.expired ? (
                        <span className="text-destructive font-medium">Expirada</span>
                      ) : (
                        formatRemaining(note.expiresAt)
                      )}
                    </td>
                    <td className="py-2 px-3">{note.isProtected ? "Sim" : "Não"}</td>
                    <td className="py-2 px-3 whitespace-nowrap text-xs">
                      {note.attachmentCount > 0 ? (
                        <span title={formatBytes(note.attachmentSizeBytes)}>
                          <span className="font-medium">{note.attachmentCount}</span>
                          {" · "}
                          {formatBytes(note.attachmentSizeBytes)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(note)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDelete(note)}
                        >
                          Apagar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: [string, string][]
}) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  )
}
