/* quiz.js — quiz generation from a day's words.
 * Builds ONE question per word (full coverage: all 50 words tested, each the
 * correct answer of exactly one question) in three formats with distractors
 * drawn from the same day:
 *  - "meaning": word -> choose correct English meaning
 *  - "word":    meaning -> choose correct word
 *  - "blank":   example sentence with the word blanked -> choose correct word
 * Formats are assigned per word (round-robin) then the question ORDER is
 * shuffled so formats/words aren't in a fixed sequence. The 4 options of every
 * question are Fisher–Yates shuffled with Math.random so the correct answer's
 * A/B/C/D position is uniformly distributed with no pattern. build() runs once
 * per quiz load (renderQuiz calls Quiz.build once), so options stay stable for
 * the session.
 *
 * Safety hardening:
 *  - Distractors never share the answer's NORMALIZED meaning (no also-correct
 *    options), and if the same-day pool can't supply 3 safe distractors we draw
 *    the remainder from any day (still no meaning-collision with the answer).
 *  - "blank" questions blank EVERY occurrence of the headword (+ simple
 *    inflections). If the headword is multi-word, its surface form does not
 *    appear in the example, or blanking would leave the answer visible, the
 *    question falls back to a "word" format (which shows no example) instead of
 *    emitting a broken blank.
 */
(function () {
  "use strict";

  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor((rng ? rng() : Math.random()) * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Normalize an English gloss for "near-identical meaning" comparison.
  // Mirrors audit/audit.js normEn: lowercase, strip non-alphanumerics, drop
  // stopwords, sort the remaining tokens. Two glosses that normalize to the
  // same string are treated as the same meaning.
  var STOPWORDS = {
    a: 1, an: 1, the: 1, to: 1, of: 1, or: 1, and: 1, "in": 1, on: 1, at: 1,
    by: 1, "for": 1, "with": 1, as: 1, that: 1, which: 1, who: 1, be: 1,
    is: 1, being: 1, very: 1, extremely: 1, highly: 1, esp: 1, especially: 1,
    etc: 1
  };
  function normEn(s) {
    var cleaned = String(s == null ? "" : s).toLowerCase().replace(/[^a-z0-9 ]/gi, " ");
    var toks = cleaned.split(/\s+/).filter(function (t) {
      return t && !STOPWORDS[t];
    });
    return toks.sort().join(" ");
  }

  // Pick n distractors for `answer`. Distractors are distinct words AND distinct
  // NORMALIZED meanings from each other and from the answer, so no two of the 4
  // options ever share a meaning (keeps option texts unique in every format,
  // including "meaning" where the texts are the en strings) and no distractor is
  // ever also-correct. Prefers same-day words (`pool`); if those can't supply n
  // safe distractors, draws the remainder from `allWords` (any day), applying
  // the same no-meaning-collision guard.
  function pickDistractors(pool, answer, n, allWords) {
    var chosen = [];
    var usedEn = {};            // normalized en already represented among options
    var usedW = {};             // headwords already used
    usedEn[normEn(answer.en)] = true;
    usedW[answer.w] = true;

    function consider(list) {
      var avail = shuffle(list);
      for (var i = 0; i < avail.length && chosen.length < n; i++) {
        var cand = avail[i];
        if (usedW[cand.w]) continue;
        var nk = normEn(cand.en);
        if (usedEn[nk]) continue;        // skip also-correct / meaning-duplicate
        usedEn[nk] = true;
        usedW[cand.w] = true;
        chosen.push(cand);
      }
    }

    consider(pool);
    if (chosen.length < n && allWords && allWords.length) consider(allWords);
    return chosen;
  }

  // Does the sentence still contain the headword (or a simple inflection)?
  // Deliberately conservative: a faithful port of audit/audit.js
  // exampleContainsWord, including its 5-char-stem heuristic. We use it to
  // confirm a blank actually removed the answer; if this returns true for the
  // blanked sentence, we refuse the blank and fall back to a word question — so
  // the shown sentence is never judged to still contain the answer, even by a
  // loose cognate-stem match (e.g. "tempers" vs "temperate").
  var SUFFIXES = ["s", "es", "ed", "d", "ing", "ly", "ment", "ion", "ions",
    "al", "ive", "ness", "er", "est", "ies", "ied", "ying"];
  function sentenceHasWord(word, sentence) {
    var w = String(word == null ? "" : word).toLowerCase().trim();
    var text = String(sentence == null ? "" : sentence).toLowerCase().trim();
    if (!w || !text) return false;
    var tokens = text.replace(/[^a-z0-9À-ɏ'\- ]/gi, " ").split(/\s+/).filter(Boolean);

    var baseForms = {};
    baseForms[w] = true;
    for (var s = 0; s < SUFFIXES.length; s++) baseForms[w + SUFFIXES[s]] = true;
    if (w.charAt(w.length - 1) === "y") {
      var stemY = w.slice(0, -1);
      baseForms[stemY + "ies"] = true;
      baseForms[stemY + "ied"] = true;
      baseForms[stemY + "ier"] = true;
      baseForms[stemY + "iest"] = true;
      baseForms[stemY + "ying"] = true;
    }
    if (/[aeiou][bcdfghjklmnpqrstvwxz]$/.test(w)) {
      var last = w.charAt(w.length - 1);
      baseForms[w + last + "ed"] = true;
      baseForms[w + last + "ing"] = true;
      baseForms[w + last + "er"] = true;
    }
    if (w.indexOf("-") !== -1) {
      baseForms[w.replace(/-/g, "")] = true;
      var parts = w.split("-");
      for (var p = 0; p < parts.length; p++) if (parts[p].length >= 4) baseForms[parts[p]] = true;
    }
    var tk;
    for (var i = 0; i < tokens.length; i++) { if (baseForms[tokens[i]]) return true; }
    if (w.length >= 6) {
      var stem = w.slice(0, 5);
      for (var j = 0; j < tokens.length; j++) { tk = tokens[j]; if (tk.length >= 5 && tk.slice(0, 5) === stem) return true; }
    } else if (w.length >= 4) {
      for (var k = 0; k < tokens.length; k++) { if (tokens[k].indexOf(w) === 0) return true; }
    }
    if (w.length >= 5 && text.indexOf(w) !== -1) return true;
    return false;
  }

  // Replace EVERY whole-word occurrence of the headword (incl. simple
  // inflections: -s, -ed, -ing, y->i within 3 trailing letters) with a blank.
  // Returns { text, ok }: ok=false when the headword is multi-word, never
  // appears as a matchable token, or any occurrence would remain visible.
  function blankSentence(word, sentence) {
    var w = String(word).toLowerCase().trim();
    // Multi-word headwords can't be cleanly single-blanked here.
    if (/\s/.test(w)) return { text: sentence, ok: false };

    var stem = w.replace(/y$/, "");
    var reG = new RegExp("\\b" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[a-z]{0,3}\\b", "gi");
    if (!reG.test(sentence)) return { text: sentence, ok: false };
    reG.lastIndex = 0;
    var blanked = sentence.replace(reG, "_____");
    // Confirm nothing recognizable as the headword survives.
    if (sentenceHasWord(w, blanked)) return { text: blanked, ok: false };
    return { text: blanked, ok: true };
  }

  function meaningQuestion(item, distractors) {
    var opts = shuffle([item].concat(distractors)).map(function (o) {
      return { text: o.en, correct: o.w === item.w };
    });
    return {
      kind: "meaning",
      kindLabel: "Choose the meaning",
      promptHtml: 'What does <span class="q-word">' + esc(item.w) + "</span> mean?",
      promptText: 'What does "' + item.w + '" mean?',
      options: opts
    };
  }

  function wordQuestion(item, distractors) {
    var opts = shuffle([item].concat(distractors)).map(function (o) {
      return { text: o.w, correct: o.w === item.w };
    });
    return {
      kind: "word",
      kindLabel: "Choose the word",
      promptHtml: "Which word means “" + esc(item.en) + "”?",
      promptText: 'Which word means "' + item.en + '"?',
      options: opts
    };
  }

  function makeQuestion(item, words, allWords) {
    var kind = item._kind;
    var distractors = pickDistractors(words, item, 3, allWords);
    var q;

    if (kind === "meaning") {
      q = meaningQuestion(item, distractors);
    } else if (kind === "word") {
      q = wordQuestion(item, distractors);
    } else {
      // blank — but only if we can fully remove the headword from the example.
      var b = blankSentence(item.w, item.ex);
      if (b.ok) {
        var optsB = shuffle([item].concat(distractors)).map(function (o) {
          return { text: o.w, correct: o.w === item.w };
        });
        q = {
          kind: "blank",
          kindLabel: "Fill in the blank",
          promptHtml: 'Fill the blank: <span class="blank-sent">' + esc(b.text).replace("_____", '<span class="blank">_____</span>') + "</span>",
          promptText: "Fill the blank: " + b.text,
          options: optsB
        };
      } else {
        // Fall back to a word question (shows no example, so the answer can't leak).
        q = wordQuestion(item, distractors);
      }
    }
    q.answer = item.w;
    q.answerText = (q.kind === "meaning") ? item.en : item.w;
    return q;
  }

  // Build one question per word (full coverage). Format is assigned per word in
  // a rotating meaning/word/blank pattern, then question order is shuffled.
  var KINDS = ["meaning", "word", "blank"];
  function build(dayObj, allWords) {
    var words = dayObj.words;
    if (words.length < 8) return [];

    // Assign a format to each word (round-robin over a shuffled order so the
    // word<->format pairing varies between builds), then shuffle the order of
    // the resulting questions so formats/words aren't in a fixed sequence.
    var assigned = shuffle(words).map(function (item, idx) {
      var copy = {};
      for (var k in item) { if (Object.prototype.hasOwnProperty.call(item, k)) copy[k] = item[k]; }
      copy._kind = KINDS[idx % KINDS.length];
      return copy;
    });

    // Cross-day fallback pool: use the caller-supplied list if given, else
    // flatten every loaded day (window.DAYS), else just this day's words. Lets a
    // question still find 3 safe distractors when its own day can't supply them.
    var pool = allWords && allWords.length ? allWords : null;
    if (!pool && typeof window !== "undefined" && window.DAYS && window.DAYS.length) {
      pool = [];
      for (var di = 0; di < window.DAYS.length; di++) {
        var dw = window.DAYS[di].words;
        if (dw) for (var wi = 0; wi < dw.length; wi++) pool.push(dw[wi]);
      }
    }
    if (!pool || !pool.length) pool = words;

    var questions = shuffle(assigned).map(function (item) {
      return makeQuestion(item, words, pool);
    });

    return questions;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  window.Quiz = { build: build };
})();
