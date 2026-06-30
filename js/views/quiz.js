/* views/quiz.js — #/quiz/:day : 15-question quiz + PDF export */
(function () {
  "use strict";
  var S = window.Store;
  var el = S.el;

  function pad2(n) { return String(n).padStart(2, "0"); }

  function renderQuiz(root, day) {
    var dayObj = S.getDay(day);
    if (!dayObj || dayObj.words.length < 8) { location.hash = "#/home"; return; }

    var questions = window.Quiz.build(dayObj);
    var answers = new Array(questions.length).fill(null); // selected option index
    var pos = 0;
    var submitted = false;

    root.innerHTML = "";
    var header = el("div", { class: "study-header" }, [
      el("a", { class: "back-chevron", href: "#/home", "aria-label": "Back to home" }, ["←"]),
      el("div", {}, [
        el("div", { class: "study-title", text: "Day " + pad2(dayObj.day) + " Quiz" }),
        el("div", { class: "study-sub", text: dayObj.theme })
      ]),
      el("div")
    ]);
    root.appendChild(header);

    var nameWrap = el("div", { class: "quiz-name" }, [
      el("label", { for: "studentName", text: "Student name (for the PDF)" }),
      el("input", {
        class: "text-input", id: "studentName", type: "text",
        placeholder: "Type your name", value: S.getStudentName(),
        oninput: function (e) { S.setStudentName(e.target.value); }
      })
    ]);
    root.appendChild(nameWrap);

    var body = el("div");
    root.appendChild(body);

    var skipWarning = false;

    function drawQuestion() {
      body.innerHTML = "";
      var q = questions[pos];

      body.appendChild(el("div", { class: "quiz-progress" }, [
        el("div", { class: "progress-track track" }, [
          el("div", { class: "progress-fill", style: "width:" + Math.round(((pos + 1) / questions.length) * 100) + "%" })
        ]),
        el("div", { class: "count", text: pad2(pos + 1) + "/" + pad2(questions.length) })
      ]));

      var optionsBox = el("div", { class: "options" });
      q.options.forEach(function (opt, i) {
        var selected = answers[pos] === i;
        optionsBox.appendChild(el("button", {
          class: "option" + (selected ? " selected" : ""),
          type: "button",
          onclick: function () { answers[pos] = i; skipWarning = false; drawQuestion(); }
        }, [
          el("span", { class: "marker", text: String.fromCharCode(65 + i) }),
          el("span", { text: opt.text })
        ]));
      });

      var card = el("div", { class: "q-card" }, [
        el("div", { class: "q-kind", text: q.kindLabel }),
        el("div", { class: "q-prompt", html: q.promptHtml }),
        optionsBox
      ]);
      body.appendChild(card);

      // nav
      var nav = el("div", { class: "quiz-nav" });
      nav.appendChild(el("button", {
        class: "btn", type: "button", disabled: pos === 0 ? "disabled" : false,
        onclick: function () { if (pos > 0) { skipWarning = false; pos--; drawQuestion(); } }
      }, ["← Prev"]));

      if (pos < questions.length - 1) {
        nav.appendChild(el("button", {
          class: "btn", type: "button",
          onclick: function () {
            if (answers[pos] === null) { skipWarning = true; drawQuestion(); return; }
            skipWarning = false; pos++; drawQuestion();
          }
        }, ["Next →"]));
      } else {
        nav.appendChild(el("button", {
          class: "btn btn-primary", type: "button",
          onclick: function () {
            if (answers[pos] === null) { skipWarning = true; drawQuestion(); return; }
            skipWarning = false; trySubmit();
          }
        }, ["Submit"]));
      }
      body.appendChild(nav);

      if (skipWarning) {
        body.appendChild(el("p", {
          class: "quiz-skip-warn",
          text: "Please choose an answer. You can’t skip a question."
        }));
      }

      var answered = answers.filter(function (a) { return a !== null; }).length;
      body.appendChild(el("p", { class: "note center", text: answered + " of " + questions.length + " answered" }));
    }

    function trySubmit() {
      var firstUnanswered = answers.indexOf(null);
      if (firstUnanswered !== -1) {
        S.toast("Answer all questions first (Q" + (firstUnanswered + 1) + ")");
        pos = firstUnanswered;
        drawQuestion();
        return;
      }
      submitted = true;
      drawResults();
    }

    function scoreOf() {
      var s = 0;
      questions.forEach(function (q, i) {
        if (answers[i] !== null && q.options[answers[i]].correct) s++;
      });
      return s;
    }

    function drawResults() {
      var score = scoreOf();
      var pct = Math.round((score / questions.length) * 100);
      var name = S.getStudentName() || "(no name)";

      root.innerHTML = "";
      root.appendChild(el("div", { class: "study-header" }, [
        el("a", { class: "back-chevron", href: "#/home", "aria-label": "Back to home" }, ["←"]),
        el("div", {}, [el("div", { class: "study-title", text: "Day " + pad2(dayObj.day) + " Results" })]),
        el("div")
      ]));

      root.appendChild(el("div", { class: "score-box" }, [
        el("div", { class: "score-big", html: score + '<span class="slash">/' + questions.length + "</span>" }),
        el("div", { class: "score-pct", text: pct + "% correct" }),
        el("div", { class: "score-name", html: "Student: <strong>" + S.escapeHtml(name) + "</strong>" })
      ]));

      root.appendChild(el("div", { class: "export-row" }, [
        el("button", { class: "btn btn-primary btn-block", type: "button", onclick: function () { exportQuizPDF(dayObj, questions, answers, score); } }, ["Download PDF"])
      ]));

      // review
      questions.forEach(function (q, i) {
        var chosen = q.options[answers[i]];
        var correct = q.options.find(function (o) { return o.correct; });
        var ok = chosen && chosen.correct;
        var item = el("div", { class: "review-item" }, [
          el("div", { class: "review-q", html: pad2(i + 1) + ". " + q.promptHtml }),
          el("div", { class: "review-line " + (ok ? "ok" : "no") }, [
            el("span", { class: "tag", text: ok ? "Correct" : "Your" }),
            el("span", { class: "val", text: chosen ? chosen.text : "(blank)" })
          ])
        ]);
        if (!ok) {
          item.appendChild(el("div", { class: "review-line ok" }, [
            el("span", { class: "tag", text: "Answer" }),
            el("span", { class: "val", text: correct.text })
          ]));
        }
        root.appendChild(item);
      });

      root.appendChild(el("div", { class: "export-row" }, [
        el("a", { class: "btn btn-block", href: "#/study/" + dayObj.day, text: "Study Day " + pad2(dayObj.day) }),
        el("a", { class: "btn btn-block", href: "#/home", text: "Home" })
      ]));
    }

    function exportQuizPDF(dayObj, questions, answers, score) {
      if (!window.jspdf || !window.jspdf.jsPDF) {
        S.toast("PDF library not loaded (offline?)");
        return;
      }
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({ unit: "pt", format: "a4" });
      var marginX = 48, y = 56, pageH = doc.internal.pageSize.getHeight();
      var name = S.getStudentName() || "_______________";

      doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text("SAT 2000: Vocabulary Quiz", marginX, y); y += 22;
      doc.setFontSize(12); doc.setFont("helvetica", "normal");
      doc.text("Day " + pad2(dayObj.day) + " · " + dayObj.theme, marginX, y); y += 16;
      doc.text("Student: " + name, marginX, y); y += 16;
      doc.text("Date: " + S.todayStr(), marginX, y); y += 16;
      doc.setFont("helvetica", "bold");
      doc.text("Score: " + score + " / " + questions.length, marginX, y); y += 10;
      doc.setDrawColor(210); doc.line(marginX, y, doc.internal.pageSize.getWidth() - marginX, y); y += 20;

      doc.setFontSize(11);
      questions.forEach(function (q, i) {
        if (y > pageH - 90) { doc.addPage(); y = 56; }
        var chosen = q.options[answers[i]];
        var correct = q.options.find(function (o) { return o.correct; });
        var ok = chosen && chosen.correct;

        doc.setFont("helvetica", "bold");
        var promptLines = doc.splitTextToSize((i + 1) + ". " + q.promptText, 500);
        doc.text(promptLines, marginX, y); y += promptLines.length * 14 + 2;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(ok ? 31 : 200, ok ? 160 : 60, ok ? 80 : 60);
        var yourLines = doc.splitTextToSize("Your answer: " + (chosen ? chosen.text : "(blank)") + (ok ? "  (correct)" : ""), 500);
        doc.text(yourLines, marginX + 12, y); y += yourLines.length * 13;
        if (!ok) {
          doc.setTextColor(31, 160, 80);
          var corrLines = doc.splitTextToSize("Correct answer: " + correct.text, 500);
          doc.text(corrLines, marginX + 12, y); y += corrLines.length * 13;
        }
        doc.setTextColor(0, 0, 0);
        y += 8;
      });

      doc.save("SAT2000_Day" + pad2(dayObj.day) + "_Quiz_" + (name.replace(/[^a-z0-9]+/gi, "_") || "student") + ".pdf");
    }

    drawQuestion();
  }

  window.Views = window.Views || {};
  window.Views.quiz = renderQuiz;
})();
