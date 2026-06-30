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

  // Pick n distractors from the same day's pool. Excludes the answer itself and
  // any word whose meaning (en) equals the answer's meaning, so a distractor is
  // never also-correct. Picks are distinct words AND distinct meanings (en) from
  // each other, so no two of the 4 options ever share a meaning — this keeps the
  // option texts unique in every format, including "meaning" (where the texts
  // are the en strings). A handful of same-day words share an en (e.g. day 8
  // laconic/laconically), so deduping by en here is required.
  function pickDistractors(pool, answer, n) {
    var avail = shuffle(pool.filter(function (x) {
      return x.w !== answer.w && x.en !== answer.en;
    }));
    var chosen = [];
    var usedEn = {};
    usedEn[answer.en] = true;
    for (var i = 0; i < avail.length && chosen.length < n; i++) {
      var cand = avail[i];
      if (usedEn[cand.en]) continue;
      usedEn[cand.en] = true;
      chosen.push(cand);
    }
    return chosen;
  }

  // Replace whole-word occurrence of the headword (incl. simple inflections) with a blank.
  function blankSentence(word, sentence) {
    // Match the word stem with up to 3 trailing letters (handles -s, -ed, -ing, y->i).
    var stem = word.replace(/y$/, "");
    var re = new RegExp("\\b" + stem.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + "[a-z]{0,3}\\b", "i");
    if (re.test(sentence)) return sentence.replace(re, "_____");
    return sentence + " (uses “" + word + "”)";
  }

  function makeQuestion(item, words) {
    var kind = item._kind;
    var distractors = pickDistractors(words, item, 3);
    var q;

    if (kind === "meaning") {
      var optsM = shuffle([item].concat(distractors)).map(function (o) {
        return { text: o.en, correct: o.w === item.w };
      });
      q = {
        kind: "meaning",
        kindLabel: "Choose the meaning",
        promptHtml: 'What does <span class="q-word">' + esc(item.w) + "</span> mean?",
        promptText: 'What does "' + item.w + '" mean?',
        options: optsM
      };
    } else if (kind === "word") {
      var optsW = shuffle([item].concat(distractors)).map(function (o) {
        return { text: o.w, correct: o.w === item.w };
      });
      q = {
        kind: "word",
        kindLabel: "Choose the word",
        promptHtml: "Which word means “" + esc(item.en) + "”?",
        promptText: 'Which word means "' + item.en + '"?',
        options: optsW
      };
    } else {
      var sent = blankSentence(item.w, item.ex);
      var optsB = shuffle([item].concat(distractors)).map(function (o) {
        return { text: o.w, correct: o.w === item.w };
      });
      q = {
        kind: "blank",
        kindLabel: "Fill in the blank",
        promptHtml: 'Fill the blank: <span class="blank-sent">' + esc(sent).replace("_____", '<span class="blank">_____</span>') + "</span>",
        promptText: "Fill the blank: " + sent,
        options: optsB
      };
    }
    q.answer = item.w;
    q.answerText = (kind === "meaning") ? item.en : item.w;
    return q;
  }

  // Build one question per word (full coverage). Format is assigned per word in
  // a rotating meaning/word/blank pattern, then question order is shuffled.
  var KINDS = ["meaning", "word", "blank"];
  function build(dayObj) {
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

    var questions = shuffle(assigned).map(function (item) {
      return makeQuestion(item, words);
    });

    return questions;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  window.Quiz = { build: build };
})();
