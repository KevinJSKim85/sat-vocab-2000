/* views/lists.js — #/lists : tables + PDF/XLSX export for all active days */
(function () {
  "use strict";
  var S = window.Store;
  var el = S.el;
  var COLS = ["Word", "POS", "IPA", "English", "Korean", "Example"];

  function pad2(n) { return String(n).padStart(2, "0"); }
  function activeDays() { return (window.DAYS || []).filter(function (d) { return d.words.length > 0; }); }

  function rowsFor(dayObj) {
    return dayObj.words.map(function (w) { return [w.w, w.pos, w.ipa, w.en, w.ko, w.ex]; });
  }

  function renderLists(root) {
    root.innerHTML = "";
    root.appendChild(el("div", { class: "study-header" }, [
      el("a", { class: "back-chevron", href: "#/home", "aria-label": "Back to home" }, ["←"]),
      el("div", {}, [el("div", { class: "study-title", text: "Lists / Export" })]),
      el("div")
    ]));

    var days = activeDays();

    // "All" export row
    root.appendChild(el("div", { class: "list-section" }, [
      el("div", { class: "list-head" }, [
        el("h2", { text: "All active days" }),
        el("span", { class: "ko", text: days.reduce(function (n, d) { return n + d.words.length; }, 0) + " words" })
      ]),
      el("div", { class: "export-row" }, [
        el("button", { class: "btn", type: "button", onclick: function () { exportPDF(days, "SAT2000_All_2000words"); } }, ["Download PDF (all)"]),
        el("button", { class: "btn", type: "button", onclick: function () { exportXLSX(days, "SAT2000_All_2000words"); } }, ["Download Excel (all)"])
      ])
    ]));

    days.forEach(function (d) {
      var section = el("div", { class: "list-section" });
      section.appendChild(el("div", { class: "list-head" }, [
        el("h2", { text: "Day " + pad2(d.day) + " · " + d.theme }),
        el("span", { class: "ko", text: d.theme_ko + " · " + d.words.length + " words" })
      ]));
      section.appendChild(el("div", { class: "export-row" }, [
        el("button", { class: "btn", type: "button", onclick: function () { exportPDF([d], "SAT2000_Day" + pad2(d.day)); } }, ["Download PDF"]),
        el("button", { class: "btn", type: "button", onclick: function () { exportXLSX([d], "SAT2000_Day" + pad2(d.day)); } }, ["Download Excel (XLS)"])
      ]));

      var thead = el("thead", {}, [el("tr", {}, COLS.map(function (c) { return el("th", { text: c }); }))]);
      var tbody = el("tbody");
      d.words.forEach(function (w) {
        tbody.appendChild(el("tr", {}, [
          el("td", { class: "w", text: w.w }),
          el("td", { text: w.pos }),
          el("td", { class: "ipa", text: w.ipa }),
          el("td", { text: w.en }),
          el("td", { text: w.ko }),
          el("td", { text: w.ex })
        ]));
      });
      section.appendChild(el("div", { class: "table-wrap" }, [el("table", { class: "vocab" }, [thead, tbody])]));
      root.appendChild(section);
    });

    root.appendChild(el("p", {
      class: "note",
      text: "PDF uses jsPDF + AutoTable; Excel uses SheetJS (xlsx). Both run fully in your browser. Standalone export files (all 2000 words) also live in /exports."
    }));
  }

  function exportPDF(daysArr, filenameBase) {
    if (!window.jspdf || !window.jspdf.jsPDF) { S.toast("PDF library not loaded (offline?)"); return; }
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    var first = true;

    daysArr.forEach(function (d) {
      if (!first) doc.addPage();
      first = false;
      doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text("SAT 2000 — Day " + pad2(d.day) + " · " + d.theme + "  (" + d.theme_ko + ")", 40, 40);
      if (typeof doc.autoTable === "function") {
        doc.autoTable({
          head: [COLS],
          body: rowsFor(d),
          startY: 56,
          styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak", valign: "top" },
          headStyles: { fillColor: [31, 200, 92], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 245, 245] },
          columnStyles: {
            0: { cellWidth: 80, font: "courier" },
            1: { cellWidth: 36 },
            2: { cellWidth: 90, font: "courier" },
            3: { cellWidth: 150 },
            4: { cellWidth: 90 },
            5: { cellWidth: 300 }
          },
          margin: { left: 40, right: 40 }
        });
      } else {
        // fallback: plain text dump if autotable missing
        var y = 70; doc.setFontSize(9); doc.setFont("courier", "normal");
        d.words.forEach(function (w) {
          if (y > 540) { doc.addPage(); y = 50; }
          doc.text((w.w + " (" + w.pos + ") " + w.ipa + " — " + w.en + " / " + w.ko).slice(0, 120), 40, y); y += 14;
        });
      }
    });
    doc.save(filenameBase + ".pdf");
  }

  function exportXLSX(daysArr, filenameBase) {
    if (!window.XLSX) { S.toast("Excel library not loaded (offline?)"); return; }
    var XLSX = window.XLSX;
    var wb = XLSX.utils.book_new();
    daysArr.forEach(function (d) {
      var aoa = [COLS].concat(rowsFor(d));
      var ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [{ wch: 16 }, { wch: 6 }, { wch: 22 }, { wch: 34 }, { wch: 16 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, ws, "Day " + pad2(d.day));
    });
    XLSX.writeFile(wb, filenameBase + ".xlsx");
  }

  window.Views = window.Views || {};
  window.Views.lists = renderLists;
})();
