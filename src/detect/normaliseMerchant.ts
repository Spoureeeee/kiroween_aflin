export function normaliseMerchant(description: string): string {
  const tokens = description.trim().split(/\s+/);

  // Blank or whitespace-only input
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === "")) {
    return "";
  }

  // Strip trailing tokens that contain a digit, but always keep token[0]
  let end = tokens.length;
  while (end > 1 && /\d/.test(tokens[end - 1]!)) {
    end--;
  }

  return tokens.slice(0, end).join(" ").toUpperCase();
}
