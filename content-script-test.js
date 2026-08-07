/**
 * Infinite Campus Autofill — DevTools console test harness
 *
 * Clipboard-safe order (paste does NOT overwrite clipboard; only Copy does):
 * 1. Copy this entire file
 * 2. Paste it into the DevTools console and press Enter  (loads startTest)
 * 3. Copy name + points from your spreadsheet            (clipboard = grades)
 * 4. Click a score input in the gradebook               (target is remembered)
 * 5. Run in console: startTest()                        (typing does not change clipboard)
 *
 * Focus tip:
 * Clicking the console steals focus from the score input. This harness remembers
 * the last score cell you clicked, so you do NOT need to keep focus on it.
 *
 * Optional:
 *   startTest({ dryRun: true })  // parse + match only, do not write scores
 *   startTest({ debug: true })   // extra console logging (default true)
 *   startTest({ target: el })    // pass a specific input element
 *   startTest({ clipboard: "..." })  // skip clipboard API; paste grades text here
 *
 * If clipboard API is blocked (console focus), either:
 *   - click a score cell (auto-captures clipboard while page is focused), or
 *   - run captureClipboard() after clicking the page, or
 *   - startTest({ clipboard: `name\tpoints\n...` })
 */

;(function () {
  function similarity(s1, s2) {
    var longer = s1
    var shorter = s2
    if (s1.length < s2.length) {
      longer = s2
      shorter = s1
    }
    var longerLength = longer.length
    if (longerLength == 0) {
      return 1.0
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
  }

  function editDistance(s1, s2) {
    s1 = s1.toLowerCase()
    s2 = s2.toLowerCase()

    var costs = new Array()
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j
        else {
          if (j > 0) {
            var newValue = costs[j - 1]
            if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1
            costs[j - 1] = lastValue
            lastValue = newValue
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue
    }
    return costs[s2.length]
  }

  // Numbers, or IC letter codes M/X/L/I. Blank scores default to M (missing).
  function normalizeScore(rawPoints) {
    const value = String(rawPoints ?? "").trim()
    if (!value) {
      return "M"
    }

    const upper = value.toUpperCase()
    if (upper === "M" || upper === "X" || upper === "L" || upper === "I") {
      return upper
    }

    const num = Number(value)
    if (Number.isFinite(num)) {
      return num
    }

    return null
  }

  function formattClipboardContent(clipboardContent) {
    const formattedArray = []
    if (clipboardContent) {
      // Normalize Windows CRLF / lone CR so trailing Excel rows don't become junk entries
      const formatted = `${clipboardContent}`.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
      const split = formatted.split("\n")
      split.forEach((student) => {
        const line = student.trim()
        // Skip blank trailing lines Excel often adds after a copy
        if (!line) {
          return
        }
        const index = line.indexOf("\t")
        // Name-only rows (blank score cells often omit the trailing tab) keep empty points → M
        const studentName = (index === -1 ? line : line.slice(0, index)).trim()
        const number = index === -1 ? "" : line.slice(index + 1).trim()
        if (!studentName) {
          return
        }
        formattedArray.push({
          student: studentName,
          totalPoints: number,
        })
      })
    } else {
      alert("No clipboard content")
    }
    return formattedArray
  }

  function createMatchStudentsFunction(icStudents, gradesWrapper, targetInput) {
    return function matchStudents(gradesArray) {
      const focusedCellId = targetInput.closest("td").id
      const cellIdMatch = focusedCellId.match(/score(\d+)_(\d+)_(\d+)/)
      if (!cellIdMatch) {
        return []
      }

      const assignmentId = cellIdMatch[1]
      const classId = cellIdMatch[2]
      const studentIdArray = []

      for (const student of gradesArray) {
        // Empty names match every IC student via String.includes("") — skip them
        if (!student.student || !String(student.student).trim()) {
          continue
        }

        for (const ics of icStudents) {
          const formattedIcs = ics.innerText.replace(",", "")

          if (
            formattedIcs.toLowerCase().includes(student.student.toLowerCase()) ||
            ics.innerText.toLowerCase().includes(student.student.toLowerCase()) ||
            similarity(formattedIcs.toLowerCase(), student.student.toLowerCase()) > 0.8
          ) {
            const studentRow = ics.closest("tr")

            if (studentRow) {
              const studentRowIdMatch = studentRow.id.match(/studentTR\d+_(\d+)/)
              if (!studentRowIdMatch) {
                continue
              }

              const studentId = studentRowIdMatch[1]
              const expectedScoreCellId = `score${assignmentId}_${classId}_${studentId}`
              const scoreCell = gradesWrapper.document.getElementById(expectedScoreCellId)

              if (scoreCell && scoreCell.id.startsWith("score")) {
                const points = normalizeScore(student.totalPoints)
                if (points !== null) {
                  studentIdArray.push({
                    id: scoreCell.id,
                    points: points,
                    student: student.student,
                    rawPoints: student.totalPoints,
                  })
                }
                break
              }
            }
            break
          }
        }
      }

      return studentIdArray
    }
  }

  function resolveGradesWrapper() {
    const studentNames = document.querySelectorAll(".studentName a")
    const gridElement = document.querySelector("#grid")

    if (studentNames.length > 0 && gridElement) {
      return { document: document, source: "current-document" }
    }

    const mainWorkspace = document.getElementById("main-workspace")
    if (mainWorkspace && mainWorkspace.contentWindow) {
      const instructionIframe = mainWorkspace.contentWindow.document.getElementById("instruction-wrapper-iframe")
      if (instructionIframe && instructionIframe.contentWindow) {
        return { document: instructionIframe.contentWindow.document, source: "main-workspace > instruction-wrapper-iframe" }
      }
    }

    const directIframe = document.getElementById("instruction-wrapper-iframe")
    if (directIframe && directIframe.contentWindow) {
      return { document: directIframe.contentWindow.document, source: "instruction-wrapper-iframe" }
    }

    return null
  }

  function isScoreInput(el) {
    return Boolean(el && el.tagName === "INPUT" && el.closest && el.closest('td[id^="score"]'))
  }

  function rememberScoreTarget(el, source) {
    if (!isScoreInput(el)) return
    window.__icaTarget = el
    if (source) {
      const cell = el.closest("td")
      console.log("[ICA test] remembered score target:", (cell && cell.id) || el, "(" + source + ")")
    }
  }

  function getFocusedScoreInput(gradesDoc, explicitTarget) {
    // 1) Explicit option: startTest({ target: someInput })
    if (isScoreInput(explicitTarget)) {
      return explicitTarget
    }

    // 2) Last clicked / saved target (survives console focus steal)
    if (isScoreInput(window.__icaTarget)) {
      if (!gradesDoc || gradesDoc === window.__icaTarget.ownerDocument || gradesDoc.contains(window.__icaTarget)) {
        return window.__icaTarget
      }
    }

    // 3) Live focus (works if console didn't steal it)
    const focusedElement = gradesDoc.activeElement
    if (isScoreInput(focusedElement)) {
      return focusedElement
    }

    return null
  }

  async function snapshotClipboard(reason) {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        window.__icaClipboard = text
        console.log(
          "[ICA test] clipboard snapshot saved (" + reason + ", " + text.length + " chars). Safe to use console now."
        )
        return text
      }
      console.warn("[ICA test] clipboard snapshot empty (" + reason + ")")
      return ""
    } catch (error) {
      console.warn("[ICA test] clipboard snapshot failed (" + reason + "):", error && error.message ? error.message : error)
      return null
    }
  }

  async function captureClipboard() {
    // Call this after clicking the Infinite Campus page (not the console)
    return snapshotClipboard("captureClipboard()")
  }

  async function resolveClipboardContent(options) {
    if (typeof options.clipboard === "string" && options.clipboard.length) {
      console.log("[ICA test] using options.clipboard")
      return options.clipboard
    }

    if (typeof window.__icaClipboard === "string" && window.__icaClipboard.length) {
      console.log("[ICA test] using saved clipboard snapshot (" + window.__icaClipboard.length + " chars)")
      return window.__icaClipboard
    }

    // Live read often fails when DevTools console has focus
    try {
      const live = await navigator.clipboard.readText()
      if (live) {
        window.__icaClipboard = live
        return live
      }
    } catch (error) {
      console.warn("[ICA test] live clipboard read failed:", error && error.message ? error.message : error)
    }

    const manual = window.prompt(
      "Clipboard API blocked (console usually steals focus).\n\nPaste your spreadsheet name/points text here, then OK."
    )
    if (manual && manual.length) {
      window.__icaClipboard = manual
      return manual
    }

    return null
  }

  function installTargetCapture(gradesDoc) {
    if (!gradesDoc || gradesDoc.__icaTargetCaptureInstalled) return
    gradesDoc.addEventListener(
      "pointerdown",
      (event) => {
        const t = event.target
        let input = null
        if (isScoreInput(t)) {
          input = t
        } else if (t && t.closest) {
          const cell = t.closest('td[id^="score"]')
          if (cell) input = cell.querySelector("input")
        }
        if (input) {
          rememberScoreTarget(input, "click")
          // Read clipboard while the page still has user-gesture/focus
          snapshotClipboard("score-cell click")
        }
      },
      true
    )
    gradesDoc.__icaTargetCaptureInstalled = true
    console.log("[ICA test] click capture armed — click a score cell anytime, then run startTest()")
  }

  function parseClipboard(clipboardContent) {
    if (!(clipboardContent[0] === "[")) {
      return formattClipboardContent(clipboardContent)
    }
    return JSON.parse(clipboardContent)
  }

  async function fillMatchedScores(gradesWrapper, studentIdArr, options) {
    const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time))
    const scrollView = gradesWrapper.document.querySelector("#grid")
    if (scrollView) {
      scrollView.scrollTo({ top: 800, behavior: "smooth" })
    }

    await sleep(500)

    for (const item of studentIdArr) {
      const gradeInputTd = gradesWrapper.document.getElementById(item.id)
      if (!gradeInputTd) {
        console.warn("[ICA test] Missing score cell:", item.id, item)
        continue
      }

      const gradeInput = gradeInputTd.querySelector("input")
      if (!gradeInput) {
        console.warn("[ICA test] Missing input in cell:", item.id, item)
        continue
      }

      if (options.dryRun) {
        console.log("[ICA test] dryRun would write", item.points, "->", item.id, "(" + item.student + ")")
      } else {
        gradeInput.focus()
        gradeInput.value = item.points
        if (options.debug) {
          console.log("[ICA test] wrote", item.points, "->", item.id, "(" + item.student + ")")
        }
      }
      await sleep(110)
    }
  }

  async function startTest(userOptions) {
    const options = Object.assign(
      {
        dryRun: false,
        debug: true,
      },
      userOptions || {}
    )

    console.log("%c[ICA test] startTest()", "font-weight:bold", options)

    const gradesWrapper = resolveGradesWrapper()
    if (!gradesWrapper) {
      alert("Could not find grades frame. Make sure you're on the gradebook page, or paste this script into the gradebook iframe console.")
      return null
    }

    if (options.debug) {
      console.log("[ICA test] grades frame:", gradesWrapper.source)
    }

    installTargetCapture(gradesWrapper.document)

    const targetInput = getFocusedScoreInput(gradesWrapper.document, options.target)
    if (!targetInput) {
      alert(
        "Please click on a score input field for the assignment you want to fill, then run startTest() again.\n\nTip: click the cell first (it will be remembered even if the console takes focus)."
      )
      return null
    }

    // Keep using this target even if focus moves during the run
    rememberScoreTarget(targetInput, "startTest")

    const targetCell = targetInput.closest("td")
    const row = targetCell.closest("tr")
    const cells = Array.from(row.querySelectorAll("td"))
    const assignmentColumnIndex = cells.indexOf(targetCell)

    const clipboardContent = await resolveClipboardContent(options)
    if (!clipboardContent) {
      alert(
        "No clipboard content available.\n\nFix: copy spreadsheet grades, click a score cell (captures clipboard), then run startTest().\nOr run captureClipboard() after clicking the page, or startTest({ clipboard: `...` })."
      )
      return null
    }

    if (options.debug) {
      console.log("[ICA test] raw clipboard JSON:", JSON.stringify(clipboardContent))
      console.log("[ICA test] focused cell:", targetCell.id)
      console.log("[ICA test] assignment column index:", assignmentColumnIndex)
    }

    let gradesArray
    try {
      gradesArray = parseClipboard(clipboardContent)
    } catch (error) {
      alert("Failed to parse clipboard content: " + error.message)
      console.error(error)
      return null
    }

    if (!Array.isArray(gradesArray)) {
      alert("Clipboard content is not formatted correctly")
      return null
    }

    console.log("[ICA test] parsed gradesArray (" + gradesArray.length + "):", gradesArray)

    const emptyNameRows = gradesArray.filter((s) => !s.student || !String(s.student).trim())
    const blankPointRows = gradesArray.filter((s) => String(s.totalPoints ?? "").trim() === "")
    if (emptyNameRows.length) {
      console.warn("[ICA test] empty-name rows still present (should be filtered by parser):", emptyNameRows)
    }
    if (blankPointRows.length) {
      console.log("[ICA test] blank points will become M:", blankPointRows)
    }

    const icStudents = gradesWrapper.document.querySelectorAll(".studentName a")
    if (options.debug) {
      console.log("[ICA test] IC student count:", icStudents.length)
    }

    const matchStudents = createMatchStudentsFunction(icStudents, gradesWrapper, targetInput)
    const studentIdArr = matchStudents(gradesArray)

    console.log("[ICA test] matched writes (" + studentIdArr.length + "):", studentIdArr)

    const unmatched = gradesArray.filter((g) => {
      if (!g.student || !String(g.student).trim()) return false
      return !studentIdArr.some((m) => m.student === g.student)
    })
    if (unmatched.length) {
      console.warn("[ICA test] unmatched clipboard rows:", unmatched)
    }

    // Sanity checks for the bugs we fixed
    const firstIcName = icStudents[0] ? icStudents[0].innerText : null
    const zeroedFirstFromBlankName = studentIdArr.filter((m) => {
      return m.points === 0 && String(m.rawPoints ?? "").trim() === "" && m.student === ""
    })
    if (zeroedFirstFromBlankName.length) {
      console.error("[ICA test] FAIL: blank-name zero-write still present", zeroedFirstFromBlankName)
    } else {
      console.log("[ICA test] OK: no blank-name trailing zero-write detected")
    }

    const blankBecameM = studentIdArr.filter((m) => String(m.rawPoints ?? "").trim() === "" && m.points === "M")
    console.log("[ICA test] blank -> M count:", blankBecameM.length, blankBecameM)

    const letterCodes = studentIdArr.filter((m) => ["M", "X", "L", "I"].includes(m.points))
    console.log("[ICA test] letter code writes:", letterCodes)

    if (firstIcName && options.debug) {
      console.log("[ICA test] first IC student name:", firstIcName)
    }

    await fillMatchedScores(gradesWrapper, studentIdArr, options)

    const result = {
      gradesArray: gradesArray,
      studentIdArr: studentIdArr,
      unmatched: unmatched,
      blankBecameM: blankBecameM,
      letterCodes: letterCodes,
      dryRun: options.dryRun,
      focusedCellId: targetCell.id,
      gradesFrame: gradesWrapper.source,
    }

    console.log("%c[ICA test] done", "font-weight:bold", result)
    return result
  }

  // Expose for console use
  window.startTest = startTest
  window.captureClipboard = captureClipboard
  window.__icaTest = {
    startTest: startTest,
    captureClipboard: captureClipboard,
    normalizeScore: normalizeScore,
    formattClipboardContent: formattClipboardContent,
    similarity: similarity,
    rememberScoreTarget: rememberScoreTarget,
    installTargetCapture: installTargetCapture,
  }

  // Arm click capture on whatever frame we can see right now
  try {
    const early = resolveGradesWrapper()
    if (early) installTargetCapture(early.document)
    installTargetCapture(document)
  } catch (e) {
    /* ignore */
  }

  console.log("%c[ICA test] Ready.", "color:#0a0;font-weight:bold")
  console.log("[ICA test] Order: (1) paste this script  (2) copy spreadsheet  (3) click score cell  (4) startTest()")
  console.log("[ICA test] Clicking a score cell also snapshots clipboard (avoids console focus block).")
  console.log("[ICA test] Fallback: captureClipboard() after clicking page, or startTest({ clipboard: `...` })")
  console.log("[ICA test] Options: startTest({ dryRun: true })  // match only, no writes")
})()
