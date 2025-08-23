function delayedFillGrades() {
  console.log("REMOVE - Starting delayedFillGrades - you have 3 seconds to focus on a score input") // REMOVE
  setTimeout(() => {
    console.log("REMOVE - Now checking for focused input...") // REMOVE
    fillGrades()
  }, 3000)
}

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

function createMatchStudentsFunction(icStudents, gradesWrapper, targetInput) {
  return function matchStudents(gradesArray, columnIndex) {
    // Extract assignment ID from the focused cell
    const focusedCellId = targetInput.closest("td").id // score4266642870_1424326_345780
    console.log("REMOVE - Focused cell ID:", focusedCellId) // REMOVE

    // Extract assignment ID (the number after "score")
    const assignmentIdMatch = focusedCellId.match(/score(\d+)_/)
    if (!assignmentIdMatch) {
      console.log("REMOVE - Could not extract assignment ID from:", focusedCellId) // REMOVE
      return []
    }

    const assignmentId = assignmentIdMatch[1]
    console.log("REMOVE - Extracted assignment ID:", assignmentId) // REMOVE

    // Get the IC student id for each matching student.
    const studentIdArray = []
    // Go through each student object in the grades array that came from the clipboard
    for (student of gradesArray) {
      for (ics of icStudents) {
        formattedIcs = ics.innerText.replace(",", "")

        if (formattedIcs.toLowerCase().includes(student.student.toLowerCase()) || ics.innerText.toLowerCase().includes(student.student.toLowerCase()) || similarity(formattedIcs.toLowerCase(), student.student.toLowerCase()) > 0.75) {
          // Find the student's row
          const studentRow = ics.closest("tr")
          console.log("REMOVE - Found student row for", student.student, ":", studentRow?.id) // REMOVE

          if (studentRow) {
            // Get the student ID from the row ID (studentTR1424326_345780 -> 345780)
            const studentRowIdMatch = studentRow.id.match(/studentTR\d+_(\d+)/)
            if (!studentRowIdMatch) {
              console.log("REMOVE - Could not extract student ID from row:", studentRow.id) // REMOVE
              continue
            }

            const studentId = studentRowIdMatch[1]
            console.log("REMOVE - Extracted student ID:", studentId) // REMOVE

            // Construct the expected score cell ID: score{assignmentId}_1424326_{studentId}
            const expectedScoreCellId = `score${assignmentId}_1424326_${studentId}`
            console.log("REMOVE - Looking for score cell ID:", expectedScoreCellId) // REMOVE

            // Find the cell with this ID
            const scoreCell = gradesWrapper.document.getElementById(expectedScoreCellId)
            console.log("REMOVE - Found score cell:", scoreCell?.id) // REMOVE

            if (scoreCell && scoreCell.id.startsWith("score")) {
              studentIdArray.push({
                id: scoreCell.id,
                points: +student.totalPoints,
              })
              console.log("REMOVE - Added student to array:", scoreCell.id, student.totalPoints) // REMOVE
              break
            } else {
              console.log("REMOVE - Score cell not found for:", expectedScoreCellId) // REMOVE
            }
          }
          break // Only process first matching student to reduce log spam
        }
      }
    }

    return studentIdArray
  }
}

function fillGrades() {
  // REMOVE - Debug logging
  console.log("REMOVE - Starting fillGrades function")
  console.log("REMOVE - Current document URL:", window.location.href) // REMOVE
  console.log("REMOVE - Document title:", document.title) // REMOVE
  console.log("REMOVE - Document:", document)
  console.log("REMOVE - Window parent:", window.parent) // REMOVE
  console.log("REMOVE - Window top:", window.top) // REMOVE
  console.log("REMOVE - Is this an iframe?", window !== window.parent) // REMOVE

  // REMOVE - Check if we're already in the gradebook iframe
  console.log("REMOVE - Looking for gradebook elements directly:") // REMOVE
  const studentNames = document.querySelectorAll(".studentName a") // REMOVE
  console.log("REMOVE - Found student names directly:", studentNames.length) // REMOVE
  const gridElement = document.querySelector("#grid") // REMOVE
  console.log("REMOVE - Found grid element directly:", gridElement) // REMOVE

  // REMOVE - If we find gradebook elements, we might already be in the right context
  if (studentNames.length > 0 && gridElement) {
    console.log("REMOVE - We appear to be already in the gradebook iframe!") // REMOVE
    console.log("REMOVE - Setting gradesWrapper to current document") // REMOVE
    // Skip iframe navigation and use current document
    const gradesWrapper = { document: document }
    console.log("REMOVE - Final gradesWrapper:", gradesWrapper) // REMOVE

    function pasteScores(gradesObjectsArrayJson) {
      let gradesArray = gradesObjectsArrayJson

      if (!(gradesArray[0] === "[")) {
        gradesArray = formattClipboardContent(gradesArray)
      } else if (gradesArray[0] === "[") {
        // If clipboard content is already in a JSON array...
        gradesArray = JSON.parse(gradesObjectsArrayJson)
      }

      // REMOVE - Enhanced approach: require manual focus - CHECK AT PASTE TIME
      console.log("REMOVE - Looking for focused input at paste time") // REMOVE
      let focusedElement = document.activeElement // REMOVE
      console.log("REMOVE - Current focused element:", focusedElement) // REMOVE

      // REMOVE - If no score input is focused, prompt user to click first
      if (!focusedElement || focusedElement.tagName !== "INPUT" || !focusedElement.closest('td[id^="score"]')) {
        console.log("REMOVE - No score input currently focused") // REMOVE
        alert("Please click on a score input field for the assignment you want to fill, then try again.")
        return
      }

      let assignmentColumnIndex = null
      let targetInput = null

      // Check if we now have a focused score input
      if (focusedElement && focusedElement.tagName === "INPUT" && focusedElement.closest('td[id^="score"]')) {
        targetInput = focusedElement
        const targetCell = focusedElement.closest("td")
        console.log("REMOVE - Found focused score input, cell ID:", targetCell.id) // REMOVE

        // Find the column index of this cell within its row
        const row = targetCell.closest("tr")
        const cells = Array.from(row.querySelectorAll("td"))
        assignmentColumnIndex = cells.indexOf(targetCell)
        console.log("REMOVE - Found assignment column index:", assignmentColumnIndex) // REMOVE
      }

      if (assignmentColumnIndex === null) {
        console.log("REMOVE - Could not determine column index") // REMOVE
        alert("Could not determine which assignment column to fill. Please click on a score input field first.")
        return
      }

      if (!Array.isArray(gradesArray)) {
        alert("Clipboard content is not formatted correctly")
        return
      }

      console.log("REMOVE - Using assignment column index:", assignmentColumnIndex) // REMOVE

      //Get an array of student names
      const icStudents = gradesWrapper.document.querySelectorAll(".studentName a")

      const matchStudents = createMatchStudentsFunction(icStudents, gradesWrapper, targetInput)

      function updateGrades() {
        const scrollView = gradesWrapper.document.querySelector("#grid")
        scrollView.scrollTo({ top: 800, behavior: "smooth" })
        studentIdArr = matchStudents(gradesArray, assignmentColumnIndex)

        console.log("REMOVE - Student ID array:", studentIdArr) // REMOVE

        const sleep = (time) => {
          return new Promise((resolve) => setTimeout(resolve, time))
        }
        setTimeout(() => {
          async function studentIdLoop() {
            for (item of studentIdArr) {
              const gradeInputTd = gradesWrapper.document.getElementById(item.id)
              console.log("REMOVE - Looking for cell:", item.id, "found:", gradeInputTd) // REMOVE
              if (!gradeInputTd) {
                console.log("can't find student ID: ", item.id)
                continue // REMOVE - Continue to next student instead of breaking
              }

              const gradeInput = gradeInputTd.querySelector("input")
              if (gradeInput) {
                gradeInput.focus()
                gradeInput.value = item.points
                console.log("REMOVE - Set value for:", item.id, "to:", item.points) // REMOVE
              } else {
                console.log("REMOVE - No input found in cell:", item.id) // REMOVE
              }
              await sleep(110)
            }
          }
          studentIdLoop()
        }, 500)
      }
      updateGrades()
    }

    function getClipboardContent() {
      const checkClipboardContent = async () => {
        try {
          const clipboardContent = await navigator.clipboard.readText()
          console.log("REMOVE - Clipboard content:", clipboardContent) // REMOVE
          if (clipboardContent) {
            pasteScores(clipboardContent)
          } else {
            alert("No clipboard content found")
          }
        } catch (error) {
          console.log("REMOVE - Clipboard error:", error) // REMOVE
          if (error.name === "NotAllowedError") {
            alert("Clipboard access requires document focus. Please click on the page first, then try again.")
          } else {
            alert("Error accessing clipboard: " + error.message)
          }
        }
      }

      checkClipboardContent()
    }

    getClipboardContent()
    return
  }

  // Gets nested iframe within Infinite Campus where the grades are located
  console.log("REMOVE - Looking for main-workspace element") // REMOVE
  const mainWorkspace = document.getElementById("main-workspace")
  console.log("REMOVE - main-workspace element:", mainWorkspace) // REMOVE

  let gradesWrapper

  if (mainWorkspace) {
    console.log("REMOVE - main-workspace found, checking contentWindow") // REMOVE
    console.log("REMOVE - main-workspace.contentWindow:", mainWorkspace.contentWindow) // REMOVE

    if (mainWorkspace.contentWindow) {
      console.log("REMOVE - Looking for instruction-wrapper-iframe in main-workspace") // REMOVE
      const instructionIframe = mainWorkspace.contentWindow.document.getElementById("instruction-wrapper-iframe")
      console.log("REMOVE - instruction-wrapper-iframe:", instructionIframe) // REMOVE

      if (instructionIframe) {
        console.log("REMOVE - instruction-wrapper-iframe found, getting contentWindow") // REMOVE
        gradesWrapper = instructionIframe.contentWindow
        console.log("REMOVE - gradesWrapper from nested iframe:", gradesWrapper) // REMOVE
      }
    }
  }

  if (!gradesWrapper) {
    console.log("REMOVE - Nested iframe not found, trying direct instruction-wrapper-iframe") // REMOVE
    const directIframe = document.getElementById("instruction-wrapper-iframe")
    console.log("REMOVE - Direct instruction-wrapper-iframe:", directIframe) // REMOVE

    if (directIframe) {
      gradesWrapper = directIframe.contentWindow
      console.log("REMOVE - gradesWrapper from direct iframe:", gradesWrapper) // REMOVE
    }
  }

  if (!gradesWrapper) {
    console.log("REMOVE - No gradesWrapper found. Available elements with 'iframe' in id:") // REMOVE
    const allElements = document.querySelectorAll("*[id*='iframe'], iframe") // REMOVE
    allElements.forEach((el) => console.log("REMOVE - Found iframe-related element:", el.id, el.tagName, el)) // REMOVE

    console.log("REMOVE - All iframes in document:") // REMOVE
    const allIframes = document.querySelectorAll("iframe") // REMOVE
    allIframes.forEach((iframe, index) => console.log(`REMOVE - Iframe ${index}:`, iframe.id, iframe.src, iframe)) // REMOVE

    console.log("REMOVE - Trying to access parent window:") // REMOVE
    try {
      console.log("REMOVE - Parent document:", window.parent.document) // REMOVE
      const parentMainWorkspace = window.parent.document.getElementById("main-workspace") // REMOVE
      console.log("REMOVE - Parent main-workspace:", parentMainWorkspace) // REMOVE
    } catch (e) {
      console.log("REMOVE - Cannot access parent document:", e) // REMOVE
    }

    alert("Could not find grades frame. Make sure you're on the gradebook page.")
    return
  }

  console.log("REMOVE - Final gradesWrapper:", gradesWrapper) // REMOVE
  console.log("REMOVE - gradesWrapper.document:", gradesWrapper.document) // REMOVE

  function pasteScores(gradesObjectsArrayJson) {
    let gradesArray = gradesObjectsArrayJson

    if (!(gradesArray[0] === "[")) {
      gradesArray = formattClipboardContent(gradesArray)
    } else if (gradesArray[0] === "[") {
      // If clipboard content is already in a JSON array...
      gradesArray = JSON.parse(gradesObjectsArrayJson)
    }

    // REMOVE - Enhanced approach: require manual focus - CHECK AT PASTE TIME
    console.log("REMOVE - Looking for focused input in iframe at paste time") // REMOVE
    let focusedElement = gradesWrapper.document.activeElement // REMOVE
    console.log("REMOVE - Current focused element in iframe:", focusedElement) // REMOVE

    // REMOVE - If no score input is focused, prompt user to click first
    if (!focusedElement || focusedElement.tagName !== "INPUT" || !focusedElement.closest('td[id^="score"]')) {
      console.log("REMOVE - No score input currently focused in iframe") // REMOVE
      alert("Please click on a score input field for the assignment you want to fill, then try again.")
      return
    }

    let assignmentColumnIndex = null
    let targetInput = null

    // Check if we now have a focused score input
    if (focusedElement && focusedElement.tagName === "INPUT" && focusedElement.closest('td[id^="score"]')) {
      targetInput = focusedElement
      const targetCell = focusedElement.closest("td")
      console.log("REMOVE - Found focused score input in iframe, cell ID:", targetCell.id) // REMOVE

      // Find the column index of this cell within its row
      const row = targetCell.closest("tr")
      const cells = Array.from(row.querySelectorAll("td"))
      assignmentColumnIndex = cells.indexOf(targetCell)
      console.log("REMOVE - Found assignment column index in iframe:", assignmentColumnIndex) // REMOVE
    }

    if (assignmentColumnIndex === null) {
      console.log("REMOVE - Could not determine column index in iframe") // REMOVE
      alert("Could not determine which assignment column to fill. Please click on a score input field first.")
      return
    }

    if (!Array.isArray(gradesArray)) {
      alert("Clipboard content is not formatted correctly")
      return
    }

    console.log("REMOVE - Using assignment column index in iframe:", assignmentColumnIndex) // REMOVE

    //Get an array of student names
    const icStudents = gradesWrapper.document.querySelectorAll(".studentName a")

    const matchStudents = createMatchStudentsFunction(icStudents, gradesWrapper, targetInput)

    function updateGrades() {
      const scrollView = gradesWrapper.document.querySelector("#grid")
      scrollView.scrollTo({ top: 800, behavior: "smooth" })
      studentIdArr = matchStudents(gradesArray, assignmentColumnIndex)

      console.log("REMOVE - Student ID array:", studentIdArr) // REMOVE

      const sleep = (time) => {
        return new Promise((resolve) => setTimeout(resolve, time))
      }
      setTimeout(() => {
        async function studentIdLoop() {
          for (item of studentIdArr) {
            const gradeInputTd = gradesWrapper.document.getElementById(item.id)
            console.log("REMOVE - Looking for cell:", item.id, "found:", gradeInputTd) // REMOVE
            if (!gradeInputTd) {
              console.log("can't find student ID: ", item.id)
              continue // REMOVE - Continue to next student instead of breaking
            }

            const gradeInput = gradeInputTd.querySelector("input")
            if (gradeInput) {
              gradeInput.focus()
              gradeInput.value = item.points
              console.log("REMOVE - Set value for:", item.id, "to:", item.points) // REMOVE
            } else {
              console.log("REMOVE - No input found in cell:", item.id) // REMOVE
            }
            await sleep(110)
          }
        }
        studentIdLoop()
      }, 500)
    }
    updateGrades()
  }

  function getClipboardContent() {
    const checkClipboardContent = async () => {
      try {
        const clipboardContent = await navigator.clipboard.readText()
        console.log("REMOVE - Clipboard content:", clipboardContent) // REMOVE
        if (clipboardContent) {
          pasteScores(clipboardContent)
        } else {
          alert("No clipboard content found")
        }
      } catch (error) {
        console.log("REMOVE - Clipboard error:", error) // REMOVE
        if (error.name === "NotAllowedError") {
          alert("Clipboard access requires document focus. Please click on the page first, then try again.")
        } else {
          alert("Error accessing clipboard: " + error.message)
        }
      }
    }

    checkClipboardContent()
  }

  getClipboardContent()
}

// Used for sheets or excel to create JSON Array of objects
function formattClipboardContent(clipboardContent) {
  formattedArray = []
  if (clipboardContent) {
    formatted = `${clipboardContent}`
    split = formatted.split("\n")
    numberSplit = split.map((student) => {
      const obj = {}
      const index = student.indexOf("\t")
      const number = student.slice(index + 1, student.length)
      const studentName = student.slice(0, index).trim()
      obj.student = studentName
      obj.totalPoints = number
      formattedArray.push(obj)
    })
  } else {
    alert("No clipboard content")
  }
  return formattedArray
}