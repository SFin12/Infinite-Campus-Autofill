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

function createMatchStudentsFunction(icStudents, gradesWrapper, targetInput) {
  return function matchStudents(gradesArray, columnIndex) {
    // Extract assignment ID and class ID from the focused cell
    const focusedCellId = targetInput.closest("td").id
    
    // Extract assignment ID and class ID (score{assignmentId}_{classId}_{studentId})
    const cellIdMatch = focusedCellId.match(/score(\d+)_(\d+)_(\d+)/)
    if (!cellIdMatch) {
      return []
    }

    const assignmentId = cellIdMatch[1]
    const classId = cellIdMatch[2]

    // Get the IC student id for each matching student.
    const studentIdArray = []
    // Go through each student object in the grades array that came from the clipboard
    for (student of gradesArray) {
      // Empty names match every IC student via String.includes("") — skip them
      if (!student.student || !String(student.student).trim()) {
        continue
      }

      for (ics of icStudents) {
        formattedIcs = ics.innerText.replace(",", "")

        if (formattedIcs.toLowerCase().includes(student.student.toLowerCase()) || ics.innerText.toLowerCase().includes(student.student.toLowerCase()) || similarity(formattedIcs.toLowerCase(), student.student.toLowerCase()) > 0.80) {
          // Find the student's row
          const studentRow = ics.closest("tr")
          
          if (studentRow) {
            // Get the student ID from the row ID (studentTR{classId}_{studentId} -> studentId)
            const studentRowIdMatch = studentRow.id.match(/studentTR\d+_(\d+)/)
            if (!studentRowIdMatch) {
              continue
            }

            const studentId = studentRowIdMatch[1]

            // Construct the expected score cell ID using the dynamic class ID
            const expectedScoreCellId = `score${assignmentId}_${classId}_${studentId}`

            // Find the cell with this ID
            const scoreCell = gradesWrapper.document.getElementById(expectedScoreCellId)

            if (scoreCell && scoreCell.id.startsWith("score")) {
              const points = normalizeScore(student.totalPoints)
              if (points !== null) {
                studentIdArray.push({
                  id: scoreCell.id,
                  points: points,
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

function fillGrades() {
  // Check if we're already in the gradebook iframe
  const studentNames = document.querySelectorAll(".studentName a");
  const gridElement = document.querySelector("#grid");
  
  // If we find gradebook elements, we might already be in the right context
  if (studentNames.length > 0 && gridElement) {
    // Skip iframe navigation and use current document
    const gradesWrapper = { document: document };
    
    function pasteScores(gradesObjectsArrayJson) {
      let gradesArray = gradesObjectsArrayJson

      if (!(gradesArray[0] === "[")) {
        gradesArray = formattClipboardContent(gradesArray)
      } else if (gradesArray[0] === "[") {
        // If clipboard content is already in a JSON array...
        gradesArray = JSON.parse(gradesObjectsArrayJson)
      }
      
      // Enhanced approach: require manual focus
      let focusedElement = document.activeElement;
      
      // If no score input is focused, prompt user to click first
      if (!focusedElement || focusedElement.tagName !== 'INPUT' || !focusedElement.closest('td[id^="score"]')) {
        alert("Please click on a score input field for the assignment you want to fill, then try again.");
        return;
      }
      
      let assignmentColumnIndex = null;
      let targetInput = null;
      
      // Check if we now have a focused score input
      if (focusedElement && focusedElement.tagName === 'INPUT' && focusedElement.closest('td[id^="score"]')) {
        targetInput = focusedElement;
        const targetCell = focusedElement.closest('td');
        
        // Find the column index of this cell within its row
        const row = targetCell.closest('tr');
        const cells = Array.from(row.querySelectorAll('td'));
        assignmentColumnIndex = cells.indexOf(targetCell);
      }

      if (assignmentColumnIndex === null) {
        alert("Could not determine which assignment column to fill. Please click on a score input field first.");
        return;
      }

      if (!Array.isArray(gradesArray)) {
        alert("Clipboard content is not formatted correctly")
        return
      }

      //Get an array of student names
      const icStudents = gradesWrapper.document.querySelectorAll(".studentName a")

      const matchStudents = createMatchStudentsFunction(icStudents, gradesWrapper, targetInput)

      function updateGrades() {
        const scrollView = gradesWrapper.document.querySelector("#grid")
        scrollView.scrollTo({ top: 800, behavior: "smooth" })
        studentIdArr = matchStudents(gradesArray, assignmentColumnIndex)

        const sleep = (time) => {
          return new Promise((resolve) => setTimeout(resolve, time))
        }
        setTimeout(() => {
          async function studentIdLoop() {
            for (item of studentIdArr) {
              const gradeInputTd = gradesWrapper.document.getElementById(item.id)
              if (!gradeInputTd) {
                continue;
              }

              const gradeInput = gradeInputTd.querySelector("input")
              if (gradeInput) {
                gradeInput.focus()
                gradeInput.value = item.points
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
          if (clipboardContent) {
            pasteScores(clipboardContent)
          } else {
            alert("No clipboard content found")
          }
        } catch (error) {
          if (error.name === 'NotAllowedError') {
            alert("Clipboard access requires document focus. Please click on the page first, then try again.")
          } else {
            alert("Error accessing clipboard: " + error.message)
          }
        }
      }

      checkClipboardContent()
    }

    getClipboardContent();
    return;
  }
  
  // Gets nested iframe within Infinite Campus where the grades are located
  const mainWorkspace = document.getElementById("main-workspace");
  
  let gradesWrapper;
  
  if (mainWorkspace) {
    if (mainWorkspace.contentWindow) {
      const instructionIframe = mainWorkspace.contentWindow.document.getElementById("instruction-wrapper-iframe");
      
      if (instructionIframe) {
        gradesWrapper = instructionIframe.contentWindow;
      }
    }
  }
  
  if (!gradesWrapper) {
    const directIframe = document.getElementById("instruction-wrapper-iframe");
    
    if (directIframe) {
      gradesWrapper = directIframe.contentWindow;
    }
  }
  
  if (!gradesWrapper) {
    alert("Could not find grades frame. Make sure you're on the gradebook page.")
    return;
  }

  function pasteScores(gradesObjectsArrayJson) {
    let gradesArray = gradesObjectsArrayJson

    if (!(gradesArray[0] === "[")) {
      gradesArray = formattClipboardContent(gradesArray)
    } else if (gradesArray[0] === "[") {
      // If clipboard content is already in a JSON array...
      gradesArray = JSON.parse(gradesObjectsArrayJson)
    }
    
    // Enhanced approach: require manual focus
    let focusedElement = gradesWrapper.document.activeElement;
    
    // If no score input is focused, prompt user to click first
    if (!focusedElement || focusedElement.tagName !== 'INPUT' || !focusedElement.closest('td[id^="score"]')) {
      alert("Please click on a score input field for the assignment you want to fill, then try again.");
      return;
    }
    
    let assignmentColumnIndex = null;
    let targetInput = null;
    
    // Check if we now have a focused score input
    if (focusedElement && focusedElement.tagName === 'INPUT' && focusedElement.closest('td[id^="score"]')) {
      targetInput = focusedElement;
      const targetCell = focusedElement.closest('td');
      
      // Find the column index of this cell within its row
      const row = targetCell.closest('tr');
      const cells = Array.from(row.querySelectorAll('td'));
      assignmentColumnIndex = cells.indexOf(targetCell);
    }

    if (assignmentColumnIndex === null) {
      alert("Could not determine which assignment column to fill. Please click on a score input field first.");
      return;
    }

    if (!Array.isArray(gradesArray)) {
      alert("Clipboard content is not formatted correctly")
      return
    }

    //Get an array of student names
    const icStudents = gradesWrapper.document.querySelectorAll(".studentName a")

    const matchStudents = createMatchStudentsFunction(icStudents, gradesWrapper, targetInput)

    function updateGrades() {
      const scrollView = gradesWrapper.document.querySelector("#grid")
      scrollView.scrollTo({ top: 800, behavior: "smooth" })
      studentIdArr = matchStudents(gradesArray, assignmentColumnIndex)

      const sleep = (time) => {
        return new Promise((resolve) => setTimeout(resolve, time))
      }
      setTimeout(() => {
        async function studentIdLoop() {
          for (item of studentIdArr) {
            const gradeInputTd = gradesWrapper.document.getElementById(item.id)
            if (!gradeInputTd) {
              continue;
            }

            const gradeInput = gradeInputTd.querySelector("input")
            if (gradeInput) {
              gradeInput.focus()
              gradeInput.value = item.points
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
        if (clipboardContent) {
          pasteScores(clipboardContent)
        } else {
          alert("No clipboard content found")
        }
      } catch (error) {
        if (error.name === 'NotAllowedError') {
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
    // Normalize Windows CRLF / lone CR so trailing Excel rows don't become junk entries
    formatted = `${clipboardContent}`.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    split = formatted.split("\n")
    numberSplit = split.map((student) => {
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
      const obj = {}
      obj.student = studentName
      obj.totalPoints = number
      formattedArray.push(obj)
    })
  } else {
    alert("No clipboard content")
  }
  return formattedArray
}

fillGrades()