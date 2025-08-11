// Frontend-only text processing utilities (converted from Python backend)

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'if', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with', 'this', 'those', 'these', 'your', 'you', 'i', 'we', 'our', 'us', 'their', 'they', 'them', 'he', 'she', 'his', 'her', 'or', 'nor', 'not', 'but', 'than', 'then', 'so', 'too', 'very', 'can', 'just', 'should', 'would', 'could', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'any', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'further', 'here', 'how', 'more', 'most', 'other', 'over', 'own', 'same', 'some', 'such', 'under', 'until', 'up', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'yourself', 'themselves', 'itself', 'ourselves', 'myself', "don't", "can't", "won't", "shouldn't", "couldn't", "isn't", "aren't", "wasn't", "weren't", "i'm", "you're", "we're", "they're", "it's", "that's", "there's", "here's", "what's", "who's", "didn't", "haven't", "hasn't", "hadn't", "doesn't", "shouldn't", "wouldn't", "mustn't", "mightn't", "needn't"
]);

// Generate UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Extract text from PDF using pdf.js
export async function extractTextFromPDF(file) {
  try {
    // Use legacy bundle to avoid nested ESM imports in worker
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    
    // Prefer a public, absolute worker path served by our app
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    } catch (e) {
      // no-op; we'll try legacy packaged paths below
    }

    // Fallbacks in case public asset is missing
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/legacy/build/pdf.worker.min.js',
          import.meta.url
        ).toString();
      } catch (e) {
        // Final fallback to ESM worker path
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
      }
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    throw new Error(`Failed to read PDF: ${error.message}`);
  }
}

// Split text into sentences
export function splitSentences(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) return [];
  
  // Split on .?! followed by space
  const parts = cleanText.split(/(?<=[.!?])\s+/);
  // Filter very short sentences
  return parts.filter(s => s.trim().length >= 30).map(s => s.trim());
}

// Tokenize text
export function tokenize(text) {
  const tokenRegex = /[A-Za-z][A-Za-z\-']+/g;
  const matches = text.match(tokenRegex) || [];
  return matches.map(token => token.toLowerCase());
}

// Get top keywords from text
export function topKeywords(text, k = 12) {
  const freq = {};
  const tokens = tokenize(text);
  
  tokens.forEach(token => {
    if (STOPWORDS.has(token) || token.length < 3) return;
    freq[token] = (freq[token] || 0) + 1;
  });
  
  // Sort by frequency desc then alphabetically
  const candidates = Object.entries(freq)
    .sort(([a, freqA], [b, freqB]) => freqB - freqA || a.localeCompare(b));
  
  return candidates.slice(0, k).map(([word]) => word);
}

// Build quiz questions from sentences and keywords
export function buildQuiz(sentences, keywords, total = 10) {
  const quiz = [];
  const usedKeys = new Set();
  const distractPool = [...keywords];
  
  // Set random seed for consistent results
  let seed = 42;
  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  
  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(seededRandom() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  // Generate fill-in-the-blank questions
  for (const sentence of sentences) {
    if (quiz.length >= total) break;
    
    // Find a keyword present in sentence
    let key = null;
    for (const k of keywords) {
      if (usedKeys.has(k)) continue;
      
      const regex = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(sentence)) {
        key = k;
        break;
      }
    }
    
    if (!key) continue;
    usedKeys.add(key);
    
    const qtext = sentence.replace(
      new RegExp(`\\b${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i'),
      '_____'
    );
    
    // Options: correct + 3 random distractors
    const distractors = distractPool.filter(d => d !== key);
    const shuffledDistractors = shuffle(distractors).slice(0, 3);
    const options = shuffle([key, ...shuffledDistractors]);
    const answerIndex = options.indexOf(key);
    
    quiz.push({
      id: generateUUID(),
      question: qtext,
      options,
      answer_index: answerIndex,
      qtype: 'mcq'
    });
  }
  
  // Fill remaining with True/False questions
  let i = 0;
  while (quiz.length < total && i < sentences.length) {
    const s = sentences[i];
    i++;
    const stmt = s.length <= 180 ? s : s.slice(0, 177) + '...';
    
    quiz.push({
      id: generateUUID(),
      question: `True/False: ${stmt}`,
      options: ['True', 'False'],
      answer_index: 0,
      qtype: 'tf'
    });
  }
  
  // Hard pad to ensure exactly `total` questions
  let j = 0;
  while (quiz.length < total) {
    const key = keywords[j % Math.max(1, keywords.length)] || `concept ${j + 1}`;
    const stmt = `This content discusses ${key}.`;
    
    quiz.push({
      id: generateUUID(),
      question: `True/False: ${stmt}`,
      options: ['True', 'False'],
      answer_index: 0,
      qtype: 'tf'
    });
    j++;
  }
  
  return quiz.slice(0, total);
}

// Build flashcards from sentences and keywords
export function buildFlashcards(sentences, keywords, total = 12) {
  const cards = [];
  const used = new Set();
  
  for (const k of keywords) {
    if (cards.length >= total) break;
    
    // Find a supporting sentence
    const support = sentences.find(s => 
      new RegExp(`\\b${k.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i').test(s)
    );
    
    if (!support || used.has(k)) continue;
    used.add(k);
    
    const front = `Define: ${k}`;
    const back = support.length <= 280 ? support : support.slice(0, 277) + '...';
    
    cards.push({ front, back });
  }
  
  // Add generic concept questions if needed
  while (cards.length < total && sentences.length > 0) {
    const s = sentences[cards.length % sentences.length];
    const back = s.length <= 280 ? s : s.slice(0, 277) + '...';
    cards.push({ front: 'Key idea?', back });
  }
  
  return cards.slice(0, total);
}

// Build 7-day study plan
export function buildStudyPlan(sentences, keywords) {
  const days = 7;
  const total = Math.max(sentences.length, days);
  const perDay = Math.max(1, Math.floor(total / days));
  const plan = [];
  
  for (let d = 0; d < days; d++) {
    const start = d * perDay;
    const end = start + perDay;
    const chunk = sentences.slice(start, end);
    
    // Objectives: first 3 sentences short or keyword-based
    const objectives = [];
    for (let i = 0; i < Math.min(3, chunk.length); i++) {
      const s = chunk[i];
      // Show full sentence for each objective (no truncation)
      objectives.push(s);
    }
    
    // Pad with keywords if needed
    if (objectives.length < 3) {
      const padding = 3 - objectives.length;
      for (let i = 0; i < padding && d + i < keywords.length; i++) {
        objectives.push(`Review concept: ${keywords[d + i]}`);
      }
    }
    
    const title = `Day ${d + 1}: ${keywords[d % keywords.length] || 'Focus'}`;
    plan.push({
      day: d + 1,
      title,
      objectives
    });
  }
  
  return plan;
}

// Main function to generate all study artifacts
export function generateArtifacts(rawText, title = null) {
  const text = rawText.trim();
  if (!text) {
    throw new Error('Empty content');
  }
  
  // Limit extremely long inputs
  const limitedText = text.length > 150000 ? text.slice(0, 150000) : text;
  
  let sentences = splitSentences(limitedText);
  if (sentences.length === 0) {
    // Create pseudo-sentences by chunking
    sentences = [];
    for (let i = 0; i < Math.min(limitedText.length, 2000); i += 160) {
      sentences.push(limitedText.slice(i, i + 160));
    }
  }
  
  const keywords = topKeywords(limitedText, 14);
  const quiz = buildQuiz(sentences, keywords, 10);
  const flashcards = buildFlashcards(sentences, keywords, 12);
  const plan = buildStudyPlan(sentences, keywords);
  
  return {
    id: generateUUID(),
    title: title || (sentences[0] ? sentences[0].slice(0, 40) + '...' : 'Untitled'),
    text: limitedText,
    created_at: new Date().toISOString(),
    quiz,
    flashcards,
    plan
  };
}