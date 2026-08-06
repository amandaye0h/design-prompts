import { useEffect, useMemo, useState, type ReactNode } from "react"
import { CheckIcon, CopyIcon, SearchIcon } from "lucide-react"
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
import { Toaster } from "@/components/ui/sonner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Prompt = {
  id: string
  title: string
  category: string
  prompt: string
  badges?: string[]
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
  const display =
    kind === "screenshot"
      ? "Insert Screenshot"
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

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const tokenRe =
    /\[Insert (?:screenshot|link|skill|name|branch)[^\]]*\]|\[([^\]]+)\]\((https?:\/\/[^)]+)\)/gi

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

function PromptCard({ prompt }: { prompt: Prompt }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await copyText(promptForCopy(prompt.prompt))
    setCopied(true)
    toast.success("Prompt copied")
    window.setTimeout(() => setCopied(false), 1600)
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
      </div>
      <div className="flex shrink-0 items-center border-t border-border/60 px-4 py-4 sm:border-t-0 sm:border-l sm:pl-4">
        <Button
          onClick={handleCopy}
          className="w-full bg-white text-black hover:bg-white/90 sm:w-auto"
        >
          {copied ? (
            <>
              <CheckIcon data-icon="inline-start" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon data-icon="inline-start" />
              Copy prompt
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}

export default function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}prompts.json`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load prompts")
        return res.json()
      })
      .then((data: Prompt[]) => setPrompts(data))
      .catch(() => setLoadError(true))
  }, [])

  const categories = [
    "All",
    "Core",
    "PRs",
    "Handoff",
    "Polish",
    "Prototyping",
    "E2E",
  ]

  const coreIds = [
    "prs-create-branch",
    "handoff-figma-mcp",
    "polish-feature",
    "prs-generate-description",
    "prs-push-changes",
  ]

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matchesSearch = (prompt: Prompt) => {
      if (!normalized) return true
      return `${prompt.title} ${prompt.category} ${prompt.prompt}`
        .toLowerCase()
        .includes(normalized)
    }

    if (category === "Core") {
      return coreIds
        .map((id) => prompts.find((prompt) => prompt.id === id))
        .filter((prompt): prompt is Prompt => Boolean(prompt))
        .filter(matchesSearch)
    }

    return prompts.filter((prompt) => {
      const inCategory = category === "All" || prompt.category === category
      if (!inCategory) return false
      return matchesSearch(prompt)
    })
  }, [prompts, query, category])

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <header className="flex flex-col gap-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Design Prompts
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Ready-to-copy prompts that speed up workflows for MetaMask designers
            </p>
          </div>

          <div className="relative max-w-md">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
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
            if (value) setCategory(value)
          }}
          variant="outline"
          size="sm"
          className="flex flex-wrap justify-start gap-2"
          aria-label="Prompt categories"
        >
          {categories.map((item) => (
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
            No prompts match that search.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}

        <footer className="pt-6 text-sm text-muted-foreground">
          Last updated: {__LAST_UPDATED__}
        </footer>
      </div>
      <Toaster />
    </div>
  )
}
