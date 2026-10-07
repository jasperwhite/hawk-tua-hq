import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  BubbleChatIcon,
  ChartColumnIcon,
  FavouriteIcon,
  RepeatIcon,
} from "@hugeicons/core-free-icons"

import { enrichTweet, useTweet } from "react-tweet"
import type { Tweet } from "react-tweet/api"

import { cn } from "@/lib/utils"
import { LiquidGlass } from "@/components/ui/opaline/liquid-glass"

type TweetAuthor = {
  name: string
  /** Without the @. */
  handle: string
  /** Avatar image URL. */
  avatar?: string
  verified?: boolean
}

type TweetStats = { replies?: number; reposts?: number; likes?: number; views?: number }

const compact = (n: number) =>
  new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n)

/** Turns @mentions, #hashtags and links into styled links. */
function renderText(text: string) {
  return text.split(/(@\w+|#\w+|https?:\/\/\S+)/g).map((part, i) => {
    if (/^@\w+$/.test(part))
      return (
        <a key={i} href={`https://x.com/${part.slice(1)}`} className="text-[oklch(0.62_0.17_240)] hover:underline">
          {part}
        </a>
      )
    if (/^#\w+$/.test(part))
      return (
        <a key={i} href={`https://x.com/hashtag/${part.slice(1)}`} className="text-[oklch(0.62_0.17_240)] hover:underline">
          {part}
        </a>
      )
    if (/^https?:\/\//.test(part))
      return (
        <a key={i} href={part} className="text-[oklch(0.62_0.17_240)] hover:underline" target="_blank" rel="noreferrer">
          {part.replace(/^https?:\/\/(www\.)?/, "").slice(0, 28)}
          {part.replace(/^https?:\/\/(www\.)?/, "").length > 28 ? "…" : ""}
        </a>
      )
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

function VerifiedBadge() {
  return (
    <svg viewBox="0 0 22 22" className="size-[17px] shrink-0" aria-label="Verified">
      <path
        fill="#1d9bf0"
        d="M20.4 11c0-1.3-.8-2.4-2-2.9.5-1.2.2-2.6-.7-3.5-.9-.9-2.3-1.2-3.5-.7C13.6 2.7 12.4 1.9 11 1.9S8.4 2.7 7.9 3.9c-1.2-.5-2.6-.2-3.5.7-.9.9-1.2 2.3-.7 3.5C2.5 8.6 1.7 9.7 1.7 11s.8 2.4 2 2.9c-.5 1.2-.2 2.6.7 3.5.9.9 2.3 1.2 3.5.7.5 1.2 1.7 2 3.1 2s2.6-.8 3.1-2c1.2.5 2.6.2 3.5-.7.9-.9 1.2-2.3.7-3.5 1.2-.5 2.1-1.6 2.1-2.9Z"
      />
      <path fill="#fff" d="m9.6 14.6-3.2-3.2 1.3-1.3 1.9 1.9 4.9-5 1.3 1.4-6.2 6.2Z" />
    </svg>
  )
}

type GlassProps = Omit<React.ComponentProps<typeof LiquidGlass>, "content" | "id">

type TweetData = {
  author: TweetAuthor
  /** Plain text (mentions, hashtags and links are detected) or rich content. */
  content: React.ReactNode
  /** Image URLs, up to four. */
  media?: string[]
  date?: Date | string
  stats?: TweetStats
  /** Link to the post. */
  url?: string
}

/** Accepts a tweet id or a full x.com / twitter.com status URL. */
function tweetId(input?: string) {
  if (!input) return undefined
  const match = input.match(/status(?:es)?\/(\d+)/)
  return match ? match[1] : /^\d+$/.test(input.trim()) ? input.trim() : undefined
}

/** Maps react-tweet's data to the card's shape. Throws on anything unexpected. */
function fromTweet(raw: Tweet): TweetData {
  const tweet = enrichTweet(raw)
  return {
    author: {
      name: tweet.user.name,
      handle: tweet.user.screen_name,
      avatar: tweet.user.profile_image_url_https?.replace("_normal", "_bigger"),
      verified: Boolean(tweet.user.verified || tweet.user.is_blue_verified || tweet.user.verified_type),
    },
    content: tweet.entities.map((e, i) => {
      if (e.type === "text") return <React.Fragment key={i}>{e.text}</React.Fragment>
      if (e.type === "media") return null
      return (
        <a key={i} href={e.href} target="_blank" rel="noreferrer" className="text-[oklch(0.62_0.17_240)] hover:underline">
          {e.text}
        </a>
      )
    }),
    media: (tweet.mediaDetails ?? []).map((m) => m.media_url_https),
    date: tweet.created_at,
    stats: { replies: tweet.conversation_count, likes: tweet.favorite_count },
    url: tweet.url,
  }
}

/**
 * A post from X on frosted glass: author, rich text with links, media, and
 * a stats row with a like you can tap.
 *
 * Pass `id` (or a status URL) to load a real post with `react-tweet`. While
 * it loads you see a glass skeleton; if it can't be fetched, the card falls
 * back to the data you passed (`author`, `content`, …) or, without any, to a
 * "post unavailable" card. Without `id` it simply renders your data.
 */
function GlassTweetCard({
  id,
  apiUrl,
  onError,
  author,
  content,
  media,
  date,
  stats,
  url,
  ...props
}: GlassProps &
  Partial<TweetData> & {
    /** Tweet id, or a full x.com status URL, to fetch. */
    id?: string
    /** Custom endpoint for `react-tweet`, e.g. your own `/api/tweet/[id]` route. */
    apiUrl?: string
    /** Called when the tweet can't be fetched or read. */
    onError?: (error: unknown) => void
  }) {
  const tid = tweetId(id)
  const { data, error, isLoading } = useTweet(tid, apiUrl && tid ? apiUrl.replace("[id]", tid) : undefined)
  const fallback = author && content !== undefined ? { author, content, media, date, stats, url } : null

  // Reading the response can fail on unexpected shapes; treat that like a
  // failed fetch rather than breaking the page.
  const live = React.useMemo(() => {
    if (!data) return { tweet: null, error: null }
    try {
      return { tweet: fromTweet(data), error: null }
    } catch (e) {
      return { tweet: null, error: e }
    }
  }, [data])

  const failure = error ?? live.error ?? (tid && !isLoading && !data ? new Error(`Tweet ${tid} not found`) : null)
  const reported = React.useRef<unknown>(null)
  React.useEffect(() => {
    if (failure && reported.current !== failure) {
      reported.current = failure
      onError?.(failure)
    }
  }, [failure, onError])

  if (!tid) return fallback ? <TweetView {...fallback} {...props} /> : <TweetUnavailable {...props} />
  if (live.tweet) return <TweetView {...live.tweet} {...props} />
  if (isLoading && !failure) return <TweetSkeleton {...props} />
  return fallback ? <TweetView {...fallback} {...props} /> : <TweetUnavailable tweetUrl={`https://x.com/i/status/${tid}`} {...props} />
}

const cardClass = "flex w-full max-w-[420px] flex-col gap-3 rounded-[26px] p-4 text-(--glass-foreground)"

function TweetSkeleton({ className, ...props }: GlassProps) {
  return (
    <LiquidGlass
      data-slot="glass-tweet-card"
      aria-busy
      aria-label="Loading post"
      variant="frosted"
      className={cn(cardClass, className)}
      {...props}
    >
      <div className="flex items-center gap-3 motion-safe:animate-pulse">
        <span className="size-11 rounded-full bg-current opacity-10" />
        <div className="flex flex-1 flex-col gap-2">
          <span className="h-3 w-32 rounded-full bg-current opacity-10" />
          <span className="h-2.5 w-20 rounded-full bg-current opacity-10" />
        </div>
      </div>
      <div className="flex flex-col gap-2 motion-safe:animate-pulse">
        <span className="h-3 w-full rounded-full bg-current opacity-10" />
        <span className="h-3 w-11/12 rounded-full bg-current opacity-10" />
        <span className="h-3 w-2/3 rounded-full bg-current opacity-10" />
      </div>
    </LiquidGlass>
  )
}

function TweetUnavailable({
  tweetUrl,
  className,
  ...props
}: GlassProps & { tweetUrl?: string }) {
  return (
    <LiquidGlass
      data-slot="glass-tweet-card"
      data-unavailable=""
      variant="frosted"
      className={cn(cardClass, "items-center py-7 text-center", className)}
      {...props}
    >
      <XLogo className="size-6 opacity-70" />
      <div>
        <div className="text-[15px] font-semibold tracking-[-0.01em]">This post is unavailable</div>
        <div className="text-[13px] opacity-60">It may have been deleted, or it couldn&apos;t be loaded.</div>
      </div>
      {tweetUrl ? (
        <a
          href={tweetUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-(--glass-highlight) px-3.5 py-1.5 text-[13px] font-semibold transition-transform active:scale-95"
        >
          View on X
        </a>
      ) : null}
    </LiquidGlass>
  )
}

function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z"
      />
    </svg>
  )
}

function TweetView({
  author,
  content,
  media = [],
  date,
  stats = {},
  url,
  className,
  ...props
}: GlassProps & TweetData) {
  const [liked, setLiked] = React.useState(false)
  const [pop, setPop] = React.useState(0)
  const parsed = date ? new Date(date) : null
  const when = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
  const pics = media.slice(0, 4)

  return (
    <LiquidGlass
      data-slot="glass-tweet-card"
      variant="frosted"
      className={cn(
        "flex w-full max-w-[420px] flex-col gap-3 rounded-[26px] p-4 text-(--glass-foreground)",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-(--glass-highlight) text-[15px] font-semibold ring-1 ring-white/30">
          {author.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar} alt="" className="size-full object-cover" />
          ) : (
            author.name.slice(0, 1)
          )}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1">
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{author.name}</span>
            {author.verified ? <VerifiedBadge /> : null}
          </div>
          <span className="text-[13.5px] opacity-55">@{author.handle}</span>
        </div>
        <a
          href={url ?? `https://x.com/${author.handle}`}
          target="_blank"
          rel="noreferrer"
          aria-label="View on X"
          className="grid size-8 shrink-0 place-items-center rounded-full opacity-80 transition-[background-color,opacity] hover:bg-(--glass-highlight) hover:opacity-100"
        >
          <XLogo className="size-[18px]" />
        </a>
      </div>

      <p className="text-[15px] leading-[1.45] tracking-[-0.005em] break-words whitespace-pre-wrap">
        {typeof content === "string" ? renderText(content) : content}
      </p>

      {pics.length ? (
        <div
          className={cn(
            "grid gap-1 overflow-hidden rounded-[18px] ring-1 ring-black/5",
            pics.length > 1 && "grid-cols-2",
            pics.length > 2 ? "aspect-[16/10]" : pics.length === 2 ? "aspect-[16/9]" : ""
          )}
        >
          {pics.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className={cn("size-full object-cover", pics.length === 3 && i === 0 && "row-span-2")}
            />
          ))}
        </div>
      ) : null}

      {when ? (
        <time dateTime={when.toISOString()} className="text-[13px] opacity-55">
          {new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(when)} ·{" "}
          {new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(when)}
        </time>
      ) : null}

      <div className="flex items-center justify-between border-t border-current/10 pt-2 text-[13px] [&_svg]:size-[18px]">
        <Stat icon={BubbleChatIcon} label="Replies" value={stats.replies} />
        <Stat icon={RepeatIcon} label="Reposts" value={stats.reposts} />
        <button
          type="button"
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          onClick={() => {
            setLiked((l) => !l)
            setPop((p) => p + 1)
          }}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1.5 transition-colors outline-none hover:bg-[oklch(0.65_0.22_10/0.12)] hover:text-[oklch(0.62_0.22_10)] focus-visible:ring-2 focus-visible:ring-ring/40",
            liked ? "text-[oklch(0.62_0.22_10)]" : "opacity-70"
          )}
        >
          <span
            key={pop}
            className={cn(pop > 0 && "motion-safe:animate-[opaline-pop_420ms_cubic-bezier(0.34,1.56,0.64,1)]")}
          >
            <HugeiconsIcon icon={FavouriteIcon} fill={liked ? "currentColor" : "none"} />
          </span>
          {stats.likes !== undefined ? (
            <span className="tabular-nums">{compact(stats.likes + (liked ? 1 : 0))}</span>
          ) : null}
        </button>
        <Stat icon={ChartColumnIcon} label="Views" value={stats.views} />
      </div>
    </LiquidGlass>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  label: string
  value?: number
}) {
  return (
    <span className="flex items-center gap-1.5 px-2 py-1.5 opacity-70" aria-label={value !== undefined ? `${value} ${label}` : label}>
      <HugeiconsIcon icon={icon} />
      {value !== undefined ? <span className="tabular-nums">{compact(value)}</span> : null}
    </span>
  )
}

export { GlassTweetCard, tweetId, type TweetAuthor, type TweetData, type TweetStats }
