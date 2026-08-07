import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { CheckIcon, CopyIcon, SearchIcon, StarIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Prompt = {
  id: string
  title: string
  category: string
  prompt: string
  badges?: string[]
  note?: string
  suggestedSkill?: {
    label: string
    url: string
  }
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g

const INSERT_TITLES: Record<string, string> = {
  screenshot: "Attach a screenshot when using this prompt",
  link: "Paste a link when using this prompt",
  skill: "Attach or name a skill when using this prompt",
  name: "Fill in a name when using this prompt",
  branch: "Fill in a branch, tag, or SHA when using this prompt",
}

function InsertPlaceholderBadge({ label }: { label: string }) {
  const kind =
    label.match(/screenshot|link|skill|name|branch/i)?.[0].toLowerCase() ?? ""
  const screenshotNumber = label.match(/screenshot\s*(\d+)/i)?.[1]
  const display =
    kind === "screenshot"
      ? screenshotNumber
        ? `Insert Screenshot ${screenshotNumber}`
        : "Insert Screenshot"
      : kind === "link"
        ? "Insert Link"
        : kind === "skill"
          ? "Insert Skill"
          : kind === "name"
            ? "Insert Name"
            : kind === "branch"
              ? "Insert Branch"
              : label.replace(/^\[|\]$/g, "")

  const colorClass =
    kind === "screenshot"
      ? "border-[#BDA6F7]/80 text-[#BDA6F7]"
      : kind === "skill"
        ? "border-[#F1BC8E]/80 text-[#F1BC8E]"
        : kind === "link"
          ? "border-[#8CD6E5]/80 text-[#8CD6E5]"
          : kind === "name" || kind === "branch"
            ? "border-[#98C379]/80 text-[#98C379]"
            : "border-muted-foreground/50 text-muted-foreground"

  return (
    <Badge
      variant="outline"
      className={`mx-0.5 inline-flex w-fit translate-y-[-1px] border-dashed bg-transparent align-middle font-normal ${colorClass}`}
      title={INSERT_TITLES[kind] ?? "Fill in this placeholder when using this prompt"}
    >
      {display}
    </Badge>
  )
}

function SlashCommandBadge({ command }: { command: string }) {
  return (
    <Badge
      variant="outline"
      className="mx-0.5 inline-flex w-fit translate-y-[-1px] border-dashed border-[#F1BC8E]/80 bg-transparent align-middle font-normal text-[#F1BC8E]"
      title="Invoke this Cursor skill when using this prompt"
    >
      {command}
    </Badge>
  )
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const tokenRe =
    /\[Insert (?:screenshot|link|skill|name|branch)[^\]]*\]|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\/[a-z][\w-]*/gi

  let lastIndex = 0
  let match: RegExpExecArray | null
  let tokenIndex = 0

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const full = match[0]
    if (/^\[Insert /i.test(full)) {
      nodes.push(
        <InsertPlaceholderBadge
          key={`${keyPrefix}-insert-${tokenIndex}`}
          label={full}
        />
      )
    } else if (/^\/[a-z][\w-]*$/i.test(full)) {
      nodes.push(
        <SlashCommandBadge
          key={`${keyPrefix}-cmd-${tokenIndex}`}
          command={full}
        />
      )
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${tokenIndex}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white underline underline-offset-2 hover:text-white/90"
        >
          {match[1]}
        </a>
      )
    }

    lastIndex = match.index + full.length
    tokenIndex += 1
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

function PromptBody({ text }: { text: string }) {
  return <>{renderInline(text, "prompt")}</>
}

function promptForCopy(text: string) {
  return text.replace(MARKDOWN_LINK_RE, "$1 ($2)")
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const area = document.createElement("textarea")
    area.value = text
    area.setAttribute("readonly", "")
    area.style.position = "absolute"
    area.style.left = "-9999px"
    document.body.appendChild(area)
    area.select()
    document.execCommand("copy")
    document.body.removeChild(area)
  }
}

const STARRED_KEY = "design-prompts:starred"
const STARRED_CHANGE_EVENT = "design-prompts:starred-change"

function readStarredIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STARRED_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === "string"))
  } catch {
    return new Set()
  }
}

function writeStarredIds(ids: Set<string>) {
  localStorage.setItem(STARRED_KEY, JSON.stringify([...ids]))
  window.dispatchEvent(new Event(STARRED_CHANGE_EVENT))
}

function toggleStarred(id: string): boolean {
  const ids = readStarredIds()
  if (ids.has(id)) {
    ids.delete(id)
    writeStarredIds(ids)
    return false
  }
  ids.add(id)
  writeStarredIds(ids)
  return true
}

function PromptCard({ prompt }: { prompt: Prompt }) {
  const [copied, setCopied] = useState(false)
  const [starred, setStarred] = useState(() => readStarredIds().has(prompt.id))

  useEffect(() => {
    function syncStarred() {
      setStarred(readStarredIds().has(prompt.id))
    }
    window.addEventListener(STARRED_CHANGE_EVENT, syncStarred)
    window.addEventListener("storage", syncStarred)
    return () => {
      window.removeEventListener(STARRED_CHANGE_EVENT, syncStarred)
      window.removeEventListener("storage", syncStarred)
    }
  }, [prompt.id])

  async function handleCopy() {
    await copyText(promptForCopy(prompt.prompt))
    setCopied(true)
    toast.success("Prompt copied")
    window.setTimeout(() => setCopied(false), 1600)
  }

  function handleStar() {
    const next = toggleStarred(prompt.id)
    setStarred(next)
    toast.success(next ? "Added to favorites" : "Removed from favorites")
  }

  return (
    <Card className="flex-col items-stretch gap-0 py-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-4 py-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className="w-fit border-transparent bg-muted text-muted-foreground hover:bg-muted/90">
            {prompt.category}
          </Badge>
          {prompt.badges?.map((badge) => (
            <Badge
              key={badge}
              className="w-fit border-transparent bg-muted text-muted-foreground hover:bg-muted/90"
            >
              {badge}
            </Badge>
          ))}
        </div>
        <CardTitle className="text-lg">{prompt.title}</CardTitle>
        <CardDescription className="whitespace-pre-wrap text-sm leading-relaxed">
          <PromptBody text={prompt.prompt} />
        </CardDescription>
        {prompt.suggestedSkill ? (
          <p className="text-sm text-muted-foreground">
            Suggested skill:{" "}
            <a
              href={prompt.suggestedSkill.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white underline underline-offset-2 hover:text-white/90"
            >
              {prompt.suggestedSkill.label}
            </a>
          </p>
        ) : null}
        {prompt.note ? (
          <p className="text-sm text-muted-foreground">
            Note: {prompt.note}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-border/60 px-4 py-4 sm:border-t-0 sm:border-l sm:pl-4">
        <Button
          onClick={handleStar}
          size="icon"
          variant="outline"
          aria-label={starred ? "Unstar prompt" : "Star prompt"}
          aria-pressed={starred}
          className="border-border bg-transparent hover:bg-transparent"
        >
          <StarIcon className={starred ? "fill-current" : undefined} />
        </Button>
        <Button
          data-copy-prompt
          onClick={handleCopy}
          size="icon"
          variant="outline"
          aria-label={copied ? "Copied" : "Copy prompt"}
          className="border-border bg-transparent hover:bg-transparent"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </div>
    </Card>
  )
}

const CATEGORIES = [
  "All",
  "Favorites",
  "PRs",
  "Handoff",
  "Polish",
  "Prototyping",
  "E2E",
  "System",
  "Discovery",
] as const

const FREQUENTLY_USED_IDS = [
  "prs-push-changes",
  "prototyping-testflight-build",
] as const

function categoryToPath(category: string): string {
  const base = import.meta.env.BASE_URL
  if (category === "All") return base
  return `${base}${category.toLowerCase()}`
}

function pathToCategory(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "")
  const normalized = pathname.replace(/\/$/, "") || ""
  if (!normalized || normalized === base) return "All"

  const slug = normalized.slice(base.length).replace(/^\//, "").split("/")[0]?.toLowerCase()
  if (!slug) return "All"

  return CATEGORIES.find((item) => item.toLowerCase() === slug) ?? "All"
}

function navigateToCategory(category: string, replace = false) {
  const nextPath = categoryToPath(category)
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
  if (current === nextPath || window.location.pathname.replace(/\/$/, "") === nextPath.replace(/\/$/, "")) {
    return
  }
  if (replace) {
    window.history.replaceState(null, "", nextPath)
  } else {
    window.history.pushState(null, "", nextPath)
  }
}

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState(() => pathToCategory(window.location.pathname))
  const [loadError, setLoadError] = useState(false)
  const [starredIds, setStarredIds] = useState(() => readStarredIds())
  const searchRef = useRef<HTMLInputElement>(null)

  const selectCategory = (next: string, replace = false) => {
    setCategory(next)
    navigateToCategory(next, replace)
  }

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}prompts.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load prompts")
        return res.json()
      })
      .then((data: Prompt[]) => setPrompts(data))
      .catch(() => setLoadError(true))
  }, [])

  useEffect(() => {
    const matched = pathToCategory(window.location.pathname)
    setCategory(matched)
    navigateToCategory(matched, true)
  }, [])

  useEffect(() => {
    function onPopState() {
      setCategory(pathToCategory(window.location.pathname))
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [])

  useEffect(() => {
    function syncStarred() {
      setStarredIds(readStarredIds())
    }
    window.addEventListener(STARRED_CHANGE_EVENT, syncStarred)
    window.addEventListener("storage", syncStarred)
    return () => {
      window.removeEventListener(STARRED_CHANGE_EVENT, syncStarred)
      window.removeEventListener("storage", syncStarred)
    }
  }, [])

  const visibleCategories = useMemo(
    () =>
      CATEGORIES.filter(
        (item) => item !== "Favorites" || starredIds.size > 0
      ),
    [starredIds]
  )

  useEffect(() => {
    if (category === "Favorites" && starredIds.size === 0) {
      selectCategory("All", true)
    }
  }, [category, starredIds])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.key === "/" &&
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
        return
      }

      if (
        event.key === "Escape" &&
        document.activeElement === searchRef.current
      ) {
        event.preventDefault()
        setQuery("")
        searchRef.current?.blur()
        return
      }

      const target = event.target as HTMLElement | null
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return
      }

      if (event.shiftKey && event.code === "Digit1" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        const firstCopy = document.querySelector<HTMLButtonElement>(
          "[data-copy-prompt]"
        )
        firstCopy?.focus()
        return
      }

      if (event.key !== "Enter") return

      const goPrevious = event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey
      const goNext =
        (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey

      if (!goPrevious && !goNext) return

      event.preventDefault()
      const index = visibleCategories.indexOf(
        category as (typeof CATEGORIES)[number]
      )
      const current = index === -1 ? 0 : index
      const nextIndex = goPrevious
        ? (current - 1 + visibleCategories.length) % visibleCategories.length
        : (current + 1) % visibleCategories.length
      selectCategory(visibleCategories[nextIndex]!)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [category, visibleCategories])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matchesSearch = (prompt: Prompt) => {
      if (!normalized) return true
      return `${prompt.title} ${prompt.category} ${prompt.prompt}`
        .toLowerCase()
        .includes(normalized)
    }

    return prompts.filter((prompt) => {
      const inCategory =
        category === "All"
          ? true
          : category === "Favorites"
            ? starredIds.has(prompt.id)
            : prompt.category === category
      if (!inCategory) return false
      return matchesSearch(prompt)
    })
  }, [prompts, query, category, starredIds])

  const showFrequentlyUsed =
    category === "All" && query.trim() === "" && filtered.length > 0

  const frequentlyUsed = useMemo(() => {
    if (!showFrequentlyUsed) return []
    const byId = new Map(prompts.map((prompt) => [prompt.id, prompt]))
    return FREQUENTLY_USED_IDS.flatMap((id) => {
      const prompt = byId.get(id)
      return prompt ? [prompt] : []
    })
  }, [prompts, showFrequentlyUsed])

  const remaining = useMemo(() => {
    if (!showFrequentlyUsed) return filtered
    const frequentIds = new Set<string>(FREQUENTLY_USED_IDS)
    return filtered.filter((prompt) => !frequentIds.has(prompt.id))
  }, [filtered, showFrequentlyUsed])

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Design Prompts
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                A prompt library for repeatable workflows
              </p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="shrink-0">
                  Shortcuts
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="gap-0">
                <SheetHeader>
                  <SheetTitle>Shortcuts</SheetTitle>
                  <SheetDescription>
                    Keyboard shortcuts for navigating this page.
                  </SheetDescription>
                </SheetHeader>
                <ul className="flex flex-col gap-4 px-4 pb-4">
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">
                      Move to next tab
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        ⌘
                      </kbd>
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        Enter
                      </kbd>
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">
                      Move to previous tab
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        ⌘
                      </kbd>
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        Shift ⇧
                      </kbd>
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        Enter
                      </kbd>
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">
                      Focus first copy button
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        Shift ⇧
                      </kbd>
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        1
                      </kbd>
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">
                      Focus search
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        ⌘
                      </kbd>
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        /
                      </kbd>
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-4">
                    <span className="text-sm text-foreground">
                      Clear and leave search
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        Esc
                      </kbd>
                    </span>
                  </li>
                </ul>
              </SheetContent>
            </Sheet>
          </div>

          <div className="relative max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search prompts…"
              className="pl-8"
              aria-label="Search prompts"
            />
          </div>
        </header>

        <ToggleGroup
          type="single"
          value={category}
          onValueChange={(value) => {
            if (value) selectCategory(value)
          }}
          variant="outline"
          size="sm"
          className="flex flex-wrap justify-start gap-2"
          aria-label="Prompt categories"
        >
          {visibleCategories.map((item) => (
            <ToggleGroupItem
              key={item}
              value={item}
              className="px-3 data-[state=on]:border-border data-[state=on]:bg-muted data-[state=on]:text-foreground data-[state=on]:hover:bg-muted/90"
            >
              {item}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <Separator />

        {loadError ? (
          <p className="text-sm text-muted-foreground">
            Couldn’t load prompts. Check <code>public/prompts.json</code>.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {category === "Favorites"
              ? "No favorites yet. Star a prompt to save it here."
              : "No prompts match that search."}
          </p>
        ) : showFrequentlyUsed ? (
          <div className="flex flex-col gap-8">
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Frequent
              </h2>
              <div className="flex flex-col gap-3">
                {frequentlyUsed.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} />
                ))}
              </div>
            </section>
            <section className="flex flex-col gap-3">
              {remaining.map((prompt) => (
                <PromptCard key={prompt.id} prompt={prompt} />
              ))}
            </section>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}
      </div>
      <Toaster />
    </div>
  )
}
