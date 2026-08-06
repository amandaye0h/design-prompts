import { useEffect, useMemo, useState } from "react"
import { CheckIcon, CopyIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
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
}

const INSERT_PLACEHOLDER_RE = /\[Insert (?:screenshot|link|skill)[^\]]*\]/gi

const INSERT_TITLES: Record<string, string> = {
  screenshot: "Attach a screenshot when using this prompt",
  link: "Paste a link when using this prompt",
  skill: "Attach or name a skill when using this prompt",
}

function InsertPlaceholderBadge({ label }: { label: string }) {
  const kind = label.match(/screenshot|link|skill/i)?.[0].toLowerCase() ?? ""
  const display =
    kind === "screenshot"
      ? "Insert Screenshot"
      : kind === "link"
        ? "Insert Link"
        : kind === "skill"
          ? "Insert Skill"
          : label.replace(/^\[|\]$/g, "")

  const colorClass =
    kind === "screenshot"
      ? "border-transparent bg-purple-500/15 text-purple-400/80"
      : kind === "skill"
        ? "border-transparent bg-yellow-500/15 text-yellow-400/80"
        : kind === "link"
          ? "border-transparent bg-teal-500/15 text-teal-400/80"
          : "border-muted-foreground/50 text-muted-foreground"

  return (
    <Badge
      variant="outline"
      className={`mx-0.5 inline-flex w-fit translate-y-[-1px] align-middle font-normal ${colorClass}`}
      title={INSERT_TITLES[kind] ?? "Fill in this placeholder when using this prompt"}
    >
      {display}
    </Badge>
  )
}

function PromptBody({ text }: { text: string }) {
  const parts = text.split(INSERT_PLACEHOLDER_RE)
  const matches = text.match(INSERT_PLACEHOLDER_RE) ?? []

  if (matches.length === 0) {
    return <>{text}</>
  }

  return (
    <>
      {parts.map((part, index) => (
        <span key={index}>
          {part}
          {index < matches.length ? (
            <InsertPlaceholderBadge label={matches[index]!} />
          ) : null}
        </span>
      ))}
    </>
  )
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
    await copyText(prompt.prompt)
    setCopied(true)
    toast.success("Prompt copied")
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <Card className="h-full">
      <CardHeader className="gap-2">
        <Badge className="w-fit border-transparent bg-muted text-muted-foreground hover:bg-muted/90">
          {prompt.category}
        </Badge>
        <CardTitle className="text-lg">{prompt.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <CardDescription className="whitespace-pre-wrap text-sm leading-relaxed">
          <PromptBody text={prompt.prompt} />
        </CardDescription>
      </CardContent>
      <CardFooter>
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
      </CardFooter>
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
    "Discovery",
    "PRs",
    "Handoff",
    "Polish",
    "Prototyping",
    "Other",
  ]

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return prompts.filter((prompt) => {
      const inCategory = category === "All" || prompt.category === category
      if (!inCategory) return false
      if (!normalized) return true
      return `${prompt.title} ${prompt.category} ${prompt.prompt}`
        .toLowerCase()
        .includes(normalized)
    })
  }, [prompts, query, category])

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}

        <footer className="pt-4 text-sm text-muted-foreground">
          Edit <code className="rounded-md bg-muted px-1.5 py-0.5 text-foreground">
            public/prompts.json
          </code>{" "}
          to add or update prompts.
        </footer>
      </div>
      <Toaster />
    </div>
  )
}
