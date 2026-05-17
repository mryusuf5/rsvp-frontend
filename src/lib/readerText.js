export function splitWords(content = '') {
  return String(content).split(/\s+/).filter(w => w.length > 0)
}

export function tokenizePageContent(content = '') {
  const tokens = String(content).match(/\S+|\s+/g) ?? []
  let wordIndex = 0

  return tokens.map((text, tokenIndex) => {
    if (/^\s+$/.test(text)) {
      return { type: 'space', text, key: `space-${tokenIndex}` }
    }

    const token = { type: 'word', text, wordIndex, key: `word-${wordIndex}-${tokenIndex}` }
    wordIndex += 1
    return token
  })
}
