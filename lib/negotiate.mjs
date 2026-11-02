// RFC 9110: a more specific media range controls quality, even when q=0.
function splitOutsideQuotes(value, delimiter) {
  const parts = [];
  let start = 0, quoted = false, escaped = false;
  for (let i = 0; i < value.length; i++) {
    if (escaped) { escaped = false; continue; }
    if (quoted && value[i] === "\\") { escaped = true; continue; }
    if (value[i] === '"') quoted = !quoted;
    if (!quoted && value[i] === delimiter) { parts.push(value.slice(start, i)); start = i + 1; }
  }
  parts.push(value.slice(start));
  return parts;
}

export function negotiate(accept) {
  if (!accept?.trim()) return "html";
  const ranges = splitOutsideQuotes(accept, ",").flatMap((part, index) => {
    const [rawType, ...parameters] = splitOutsideQuotes(part, ";");
    const type = rawType.trim().toLowerCase();
    if (!/^(?:text\/(?:html|markdown|\*)|\*\/\*)$/.test(type)) return [];
    let q = 1, hasQuality = false, parameterCount = 0;
    for (const parameter of parameters) {
      const match = parameter.trim().match(/^([^=]+)=(.*)$/);
      if (!match) return [];
      const name = match[1].trim().toLowerCase(), value = match[2].trim();
      if (name === "q") {
        if (hasQuality || !/^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(value)) return [];
        hasQuality = true;
        q = Number(value);
      } else if (name !== "charset" || !/^(?:utf-8|"utf-8")$/i.test(value)) return [];
      else parameterCount++;
    }
    return [{ type, q, index, parameterCount, specificity: type === "*/*" ? 0 : type === "text/*" ? 1 : 2 }];
  });
  const candidates = ["html", "markdown"].map(format => {
    const match = ranges.filter(range => ["*/*", "text/*", `text/${format}`].includes(range.type))
      .sort((a, b) => b.specificity - a.specificity || b.parameterCount - a.parameterCount || a.index - b.index)[0];
    return { format, q: match?.q ?? 0, specificity: match?.specificity ?? -1, index: match?.index ?? Infinity };
  }).filter(candidate => candidate.q > 0)
    .sort((a, b) => b.q - a.q || b.specificity - a.specificity || a.index - b.index);
  return candidates[0]?.format ?? null;
}
