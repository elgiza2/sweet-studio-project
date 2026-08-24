// Pure utilities extracted from ChatPage.tsx for reduced bundle/HMR cost.
// No React state or side effects — safe to memoize and tree-shake.

export const stripLeakedToolText = (value: string) =>
  String(value || "")
    .replace(
      /```(?:tool_code|tool_call|function_call|python)?[\s\S]*?(?:default_api|tool_code|tool_call|function_call)[\s\S]*?(?:```|$)/gi,
      "",
    )
    .replace(/<tool_call[\s\S]*?(?:<\/tool_call>|$)/gi, "")
    .replace(/<function_call[\s\S]*?(?:<\/function_call>|$)/gi, "")
    .replace(/\$\{tool_code\}\s*/gi, "")
    .replace(/(?:^|\n)[^\n]*(?:print\s*\(\s*)?default_api\.[^\n]*(?:\n|$)/gi, "\n");

export const sanitizeLeakedToolText = (value: string) => stripLeakedToolText(value).trim();

export const makeLeakedToolStreamSanitizer = () => {
  let buffer = "";
  let droppingToolLine = false;
  const markers = [
    "${tool_code}",
    "print(default_api.",
    "default_api.",
    "<tool_call",
    "<function_call",
    "```tool_code",
    "```tool_call",
    "```function_call",
    "```python",
  ];
  return (chunk: string, force = false) => {
    buffer += chunk;
    const lower = buffer.toLowerCase();
    if (droppingToolLine) {
      const nl = buffer.indexOf("\n");
      if (nl === -1) {
        buffer = "";
        return "";
      }
      buffer = buffer.slice(nl + 1);
      droppingToolLine = false;
    }
    const toolLineMatch = buffer.match(
      /(?:^|\n)[^\n]*(?:\$\{tool_code\}|default_api\.|print\s*\(\s*default_api\.)/i,
    );
    if (toolLineMatch && toolLineMatch.index !== undefined) {
      const start = toolLineMatch.index + (toolLineMatch[0].startsWith("\n") ? 1 : 0);
      const safePrefix = stripLeakedToolText(buffer.slice(0, start));
      const nl = buffer.indexOf("\n", start);
      if (nl === -1) {
        buffer = "";
        droppingToolLine = !force;
        return safePrefix;
      }
      buffer = buffer.slice(nl + 1);
      return safePrefix + stripLeakedToolText(buffer);
    }
    if (force) {
      const safe = markers.some((marker) => marker.startsWith(lower.trim())) ? "" : buffer;
      buffer = "";
      return stripLeakedToolText(safe);
    }
    if (!force) {
      const max = Math.min(80, buffer.length);
      for (let len = max; len > 0; len--) {
        const suffix = lower.slice(-len);
        if (markers.some((marker) => marker.startsWith(suffix))) {
          const safe = buffer.slice(0, -len);
          buffer = buffer.slice(-len);
          return stripLeakedToolText(safe);
        }
      }
    }
    const safe = buffer;
    buffer = "";
    return stripLeakedToolText(safe);
  };
};

export const normalizeStatusLabel = (status: string) => {
  if (!status.trim()) return "";
  const lower = status.toLowerCase();
  const blocklist = [
    "web_search",
    "browse_website",
    "shopping_search",
    "convert_currency",
    "generate_image",
    "generate_video",
    "generate_music",
    "generate_voice",
    "canva_create_slides",
    "running ",
    "tool_call",
    "function_call",
  ];
  if (blocklist.some((b) => lower.includes(b))) return "Thinking…";
  if (
    /browser task failed|browser task timed out|working on it|navigating|loading page/i.test(lower)
  )
    return "Trying another angle…";
  if (/https?:\/\//i.test(status)) return "Looking it up…";
  if (/writing the report/i.test(lower)) return "Putting the report together…";
  if (/analyzing products/i.test(lower)) return "Weighing the best picks…";
  if (/searching for products|searching stores/i.test(lower)) return "Browsing stores…";
  if (/consulting/i.test(lower)) return "Pulling references…";
  if (/reading top sources|deep_read/i.test(lower)) return "Reading through the sources…";
  if (/searching:|gathering/i.test(lower)) return "Looking it up…";
  if (/found\s+\d+\s+(results|products)/i.test(lower)) return "Going through the results…";
  if (/search completed/i.test(lower)) return "Search done.";
  if (/browsing completed/i.test(lower)) return "Done browsing.";
  if (/reviewing/i.test(lower)) return "Skimming the sources…";
  if (
    /opening|starting|browser|megsy computer|navigat|clicking|scrolling|extracting|smart browser/i.test(
      lower,
    )
  )
    return "Looking it up…";
  return "Thinking…";
};

export const DEEP_RESEARCH_STATUS_FALLBACKS = [
  "Framing the angles to dig into…",
  "Pulling the most trustworthy sources…",
  "Reading through the material…",
  "Cross-checking what they actually say…",
  "Writing this up properly…",
];

export const DOCS_STATUS_FALLBACKS = [
  "Reading what you asked for…",
  "Picking the right document shape…",
  "Lining up the data and outline…",
  "Laying out the design…",
  "Writing the content…",
  "Rendering it live…",
  "Tightening the final pass…",
  "Almost there…",
];

export const SLIDES_CLIENT_TIMEOUT_MS = 480_000;
export const SLIDES_TIMEOUT_MESSAGE =
  "Slides generation took too long and was stopped safely. Please try again.";
