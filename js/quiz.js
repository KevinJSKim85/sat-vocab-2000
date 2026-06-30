/* quiz.js — deterministic-per-load quiz generation from a day's words.
 * Builds 15 questions in three formats with distractors drawn from the same day.
 *  - "meaning": word -> choose correct English meaning
 *  - "word":    meaning -> choose correct word
 *  - "blank":   example sentence with the word blanked -> choose correct word
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

  function pickDistractors(pool, exclude, n) {
    var avail = pool.filter(function (x) { return x.w !== exclude.w; });
    return shuffle(avail).slice(0, n);
  }

  // Replace whole-word occurrence of the headword (incl. simple inflections) with a blank.
  function blankSentence(word, sentence) {
    // Match the word stem with up to 3 trailing letters (handles -s, -ed, -ing, y->i).
    var stem = word.replace(/y$/, "");
    var re = new RegExp("\\b" + stem.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + "[a-z]{0,3}\\b", "i");
    if (re.test(sentence)) return sentence.replace(re, "_____");
    return sentence + " (uses “" + word + "”)";
  }

  // Build a fixed 15-question set. Format mix: 5 meaning, 5 word, 5 blank.
  function build(dayObj) {
    var words = dayObj.words;
    if (words.length < 8) return [];

    var order = shuffle(words);
    var chosen = order.slice(0, 15);
    var questions = [];

    chosen.forEach(function (item, idx) {
      var kind = idx < 5 ? "meaning" : (idx < 10 ? "word" : "blank");
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
      questions.push(q);
    });

    return questions;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  window.Quiz = { build: build };
})();
