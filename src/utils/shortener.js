/**
 * Frontend-only friendly URL shortener that generates 5-6 pronounceable words
 * deterministically from an input string (our share token). No backend/database.
 *
 * Notes:
 * - This does NOT encode any data into the words. The actual payload stays in the URL hash (#s=...)
 *   so the visible path looks short and clean while remaining 100% stateless.
 * - The word slug is derived deterministically from the token using a 64-bit hash + PRNG,
 *   so the same token yields the same 5-6 words.
 */

// Simple FNV-1a 64-bit hash over UTF-8 bytes, returns BigInt
function fnv1a64(str) {
  let hash = 0xcbf29ce484222325n; // FNV offset basis
  const prime = 0x100000001b3n;   // FNV prime
  // Convert to UTF-8 bytes
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c & 0xff80) {
      if (c < 0x800) {
        hash ^= BigInt(0xc0 | (c >> 6));
        hash *= prime;
        hash ^= BigInt(0x80 | (c & 0x3f));
        hash *= prime;
      } else {
        hash ^= BigInt(0xe0 | (c >> 12));
        hash *= prime;
        hash ^= BigInt(0x80 | ((c >> 6) & 0x3f));
        hash *= prime;
        hash ^= BigInt(0x80 | (c & 0x3f));
        hash *= prime;
      }
    } else {
      hash ^= BigInt(c);
      hash *= prime;
    }
  }
  // Ensure uint64-like wrap
  return hash & 0xffffffffffffffffn;
}

// Xorshift64* PRNG using BigInt state
function xorshift64star(state) {
  // state is BigInt
  state ^= state >> 12n;
  state ^= state << 25n;
  state ^= state >> 27n;
  const result = (state * 0x2545F4914F6CDD1Dn) & 0xffffffffffffffffn;
  return { state, result };
}

const VOWELS = "aeiou".split("");
const CONSONANTS = "bcdfghjklmnpqrstvwxyz".split("");

function pick(arr, rnd) {
  return arr[Number(rnd % BigInt(arr.length))];
}

// Generate a pronounceable pseudo-word 4-6 chars using CV(C)V pattern
function genWord(state) {
  let s = state;
  let r;
  ({ state: s, result: r } = xorshift64star(s));
  const c1 = pick(CONSONANTS, r);
  ({ state: s, result: r } = xorshift64star(s));
  const v1 = pick(VOWELS, r);
  ({ state: s, result: r } = xorshift64star(s));
  const c2 = pick(CONSONANTS, r);
  ({ state: s, result: r } = xorshift64star(s));
  const maybe = Number(r % 3n); // 0,1,2
  let word;
  if (maybe === 0) {
    // CVCV
    ({ state: s, result: r } = xorshift64star(s));
    const v2 = pick(VOWELS, r);
    word = `${c1}${v1}${c2}${v2}`;
  } else if (maybe === 1) {
    // CVCCV
    ({ state: s, result: r } = xorshift64star(s));
    const c3 = pick(CONSONANTS, r);
    ({ state: s, result: r } = xorshift64star(s));
    const v2 = pick(VOWELS, r);
    word = `${c1}${v1}${c2}${c3}${v2}`;
  } else {
    // CVV(C)
    ({ state: s, result: r } = xorshift64star(s));
    const v2 = pick(VOWELS, r);
    const addC = Number((r >> 3n) & 1n);
    if (addC) {
      ({ state: s, result: r } = xorshift64star(s));
      const c3 = pick(CONSONANTS, r);
      word = `${c1}${v1}${v2}${c3}`;
    } else {
      word = `${c1}${v1}${v2}`;
    }
  }
  return { word, state: s };
}

export function friendlySlugFromString(input, wordCount = 5) {
  let state = fnv1a64(String(input));
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const { word, state: ns } = genWord(state);
    words.push(word);
    state = ns;
  }
  return words.join("-");
}