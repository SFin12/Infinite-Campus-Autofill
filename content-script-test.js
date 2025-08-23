function delayedFillGrades() {
  console.log("REMOVE - Starting delayedFillGrades with programmatic focus"); // REMOVE
  setTimeout(fillGrades, 3000);
}

function fillGrades() {
  // REMOVE - Debug logging
  console.log("REMOVE - Starting fillGrades function");
  console.log("REMOVE - Current document URL:", window.location.href); // REMOVE
  console.log("REMOVE - Document title:", document.title); // REMOVE
  console.log("REMOVE - Document:", document);
  console.log("REMOVE - Window parent:", window.parent); // REMOVE
  console.log("REMOVE - Window top:", window.top); // REMOVE
  console.log("REMOVE - Is this an iframe?", window !== window.parent); // REMOVE
  
  // REMOVE - Check if we're already in the gradebook iframe
  console.log("REMOVE - Looking for gradebook elements directly:"); // REMOVE
  const studentNames = document.querySelectorAll(".studentName a"); // REMOVE
  console.log("REMOVE - Found student names directly:", studentNames.length); // REMOVE
  const gridElement = document.querySelector("#grid"); // REMOVE
  console.log("REMOVE - Found grid element directly:", gridElement); // REMOVE
  
  // REMOVE - If we find gradebook elements, we might already be in the right context
  if (studentNames.length > 0 && gridElement) {
    console.log("REMOVE - We appear to be already in the gradebook iframe!"); // REMOVE
    console.log("REMOVE - Setting gradesWrapper to current document"); // REMOVE
    // Skip iframe navigation and use current document
    const gradesWrapper = { document: document };
    console.log("REMOVE - Final gradesWrapper:", gradesWrapper); // REMOVE
    
    function pasteScores(gradesObjectsArrayJson) {
      let gradesArray = gradesObjectsArrayJson

      if (!(gradesArray[0] === "[")) {
        gradesArray = formattClipboardContent(gradesArray)
      } else if (gradesArray[0] === "[") {
        // If clipboard content is already in a JSON array...
        gradesArray = JSON.parse(gradesObjectsArrayJson)
      }
      
      // REMOVE - Enhanced approach: try current focus, then programmatically focus first input
      console.log("REMOVE - Looking for focused input or auto-focusing first score input"); // REMOVE
      let focusedElement = document.activeElement; // REMOVE
      console.log("REMOVE - Current focused element:", focusedElement); // REMOVE
      
      // REMOVE - If no score input is focused, try to focus the first one programmatically
      if (!focusedElement || focusedElement.tagName !== 'INPUT' || !focusedElement.closest('td[id^="score"]')) {
        console.log("REMOVE - No score input currently focused, looking for first available score input"); // REMOVE
        
        // REMOVE - Find all score inputs and focus the first visible one
        const allScoreInputs = gradesWrapper.document.querySelectorAll('td[id^="score"] input'); // REMOVE
        console.log("REMOVE - Found score inputs:", allScoreInputs.length); // REMOVE
        
        if (allScoreInputs.length > 0) {
          // REMOVE - Try to find a visible input
          const visibleInputs = Array.from(allScoreInputs).filter(input => {
            const rect = input.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          
          if (visibleInputs.length > 0) {
            console.log("REMOVE - Auto-focusing first visible score input:", visibleInputs[0].closest('td').id); // REMOVE
            visibleInputs[0].focus();
            focusedElement = visibleInputs[0];
          } else if (allScoreInputs.length > 0) {
            // REMOVE - If no visible inputs, just use the first one
            console.log("REMOVE - No visible inputs found, using first score input:", allScoreInputs[0].closest('td').id); // REMOVE
            allScoreInputs[0].focus();
            focusedElement = allScoreInputs[0];
          }
        }
      }
      
      let assignmentId = null;
      let targetInput = null;
      
      // Check if we now have a focused score input
      if (focusedElement && focusedElement.tagName === 'INPUT' && focusedElement.closest('td[id^="score"]')) {
        targetInput = focusedElement;
        const cellId = focusedElement.closest('td').id;
        console.log("REMOVE - Using score input, cell ID:", cellId); // REMOVE
        // Extract assignment ID from cell ID (format: score{assignmentId}_{sectionId}_{studentId})
        const match = cellId.match(/^score(\d+)_/);
        if (match) {
          assignmentId = match[1];
          console.log("REMOVE - Extracted assignment ID:", assignmentId); // REMOVE
        }
      }

      if (!assignmentId) {
        alert("Could not determine which assignment to fill. No score inputs found or accessible. Make sure you're on the gradebook page with visible score inputs.");
        return;
      }

      if (!Array.isArray(gradesArray)) {
        alert("Clipboard content is not formatted correctly")
        return
      }

      console.log("REMOVE - Using assignment ID:", assignmentId); // REMOVE

      //Get an array of student names
      const icStudents = gradesWrapper.document.querySelectorAll(".studentName a")

      function matchStudents(gradesArray, assignmentId) {
        // Get the IC student id for each matching student.
        const studentIdArray = []
        // Go through each student object in the grades array that came from the clipboard
        for (student of gradesArray) {
          for (ics of icStudents) {
            formattedIcs = ics.innerText.replace(",", "")

            if (formattedIcs.toLowerCase().includes(student.student.toLowerCase()) || ics.innerText.toLowerCase().includes(student.student.toLowerCase()) || similarity(formattedIcs.toLowerCase(), student.student.toLowerCase()) > 0.75) {
              // Extract student row ID from the student row structure
              const studentRow = ics.closest('tr[id^="studentTR"]');
              if (studentRow) {
                // Extract the student identifier from the row ID (format: studentTR{sectionId}_{studentId})
                const rowIdMatch = studentRow.id.match(/^studentTR(.+)$/);
                if (rowIdMatch) {
                  const studentRowId = rowIdMatch[1];
                  // Construct the score cell ID using the assignment ID and student row ID
                  const scoreCellId = `score${assignmentId}_${studentRowId}`;
                  console.log("REMOVE - Constructed score cell ID:", scoreCellId); // REMOVE
                  
                  studentIdArray.push({
                    id: scoreCellId,
                    points: +student.totalPoints,
                  })
                  break
                }
              }
            }
          }
        }

        return studentIdArray
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

      function updateGrades() {
        const scrollView = gradesWrapper.document.querySelector("#grid")
        scrollView.scrollTo({ top: 800, behavior: "smooth" })
        studentIdArr = matchStudents(gradesArray, assignmentId)

        console.log("REMOVE - Student ID array:", studentIdArr); // REMOVE

        const sleep = (time) => {
          return new Promise((resolve) => setTimeout(resolve, time))
        }
        setTimeout(() => {
          async function studentIdLoop() {
            for (item of studentIdArr) {
              const gradeInputTd = gradesWrapper.document.getElementById(item.id)
              console.log("REMOVE - Looking for cell:", item.id, "found:", gradeInputTd); // REMOVE
              if (!gradeInputTd) {
                console.log("can't find student ID: ", item.id)
                continue; // REMOVE - Continue to next student instead of breaking
              }

              const gradeInput = gradeInputTd.querySelector("input")
              if (gradeInput) {
                gradeInput.focus()
                gradeInput.value = item.points
                console.log("REMOVE - Set value for:", item.id, "to:", item.points); // REMOVE
              } else {
                console.log("REMOVE - No input found in cell:", item.id); // REMOVE
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
        const clipboardContent = await navigator.clipboard.readText() // will force prompt if permission not granted
        if (clipboardContent) {
          pasteScores(clipboardContent)
        } else if (!clipboardContent) {
          alert("No clipboard content")
        } else if (!permissionGranted) {
          alert("After granting access to your clipboard you will need to paste again.")
        }
      }

      checkClipboardContent()
    }

    getClipboardContent();
    return;
  }
  
  // Gets nested iframe within Infinite Campus where the grades are located
  console.log("REMOVE - Looking for main-workspace element"); // REMOVE
  const mainWorkspace = document.getElementById("main-workspace");
  console.log("REMOVE - main-workspace element:", mainWorkspace); // REMOVE
  
  let gradesWrapper;
  
  if (mainWorkspace) {
    console.log("REMOVE - main-workspace found, checking contentWindow"); // REMOVE
    console.log("REMOVE - main-workspace.contentWindow:", mainWorkspace.contentWindow); // REMOVE
    
    if (mainWorkspace.contentWindow) {
      console.log("REMOVE - Looking for instruction-wrapper-iframe in main-workspace"); // REMOVE
      const instructionIframe = mainWorkspace.contentWindow.document.getElementById("instruction-wrapper-iframe");
      console.log("REMOVE - instruction-wrapper-iframe:", instructionIframe); // REMOVE
      
      if (instructionIframe) {
        console.log("REMOVE - instruction-wrapper-iframe found, getting contentWindow"); // REMOVE
        gradesWrapper = instructionIframe.contentWindow;
        console.log("REMOVE - gradesWrapper from nested iframe:", gradesWrapper); // REMOVE
      }
    }
  }
  
  if (!gradesWrapper) {
    console.log("REMOVE - Nested iframe not found, trying direct instruction-wrapper-iframe"); // REMOVE
    const directIframe = document.getElementById("instruction-wrapper-iframe");
    console.log("REMOVE - Direct instruction-wrapper-iframe:", directIframe); // REMOVE
    
    if (directIframe) {
      gradesWrapper = directIframe.contentWindow;
      console.log("REMOVE - gradesWrapper from direct iframe:", gradesWrapper); // REMOVE
    }
  }
  
  if (!gradesWrapper) {
    console.log("REMOVE - No gradesWrapper found. Available elements with 'iframe' in id:"); // REMOVE
    const allElements = document.querySelectorAll("*[id*='iframe'], iframe"); // REMOVE
    allElements.forEach(el => console.log("REMOVE - Found iframe-related element:", el.id, el.tagName, el)); // REMOVE
    
    console.log("REMOVE - All iframes in document:"); // REMOVE
    const allIframes = document.querySelectorAll("iframe"); // REMOVE
    allIframes.forEach((iframe, index) => console.log(`REMOVE - Iframe ${index}:`, iframe.id, iframe.src, iframe)); // REMOVE
    
    console.log("REMOVE - Trying to access parent window:"); // REMOVE
    try {
      console.log("REMOVE - Parent document:", window.parent.document); // REMOVE
      const parentMainWorkspace = window.parent.document.getElementById("main-workspace"); // REMOVE
      console.log("REMOVE - Parent main-workspace:", parentMainWorkspace); // REMOVE
    } catch (e) {
      console.log("REMOVE - Cannot access parent document:", e); // REMOVE
    }
    
    alert("Could not find grades frame.")
    return;
  }
  
  console.log("REMOVE - Final gradesWrapper:", gradesWrapper); // REMOVE
  console.log("REMOVE - gradesWrapper.document:", gradesWrapper.document); // REMOVE

  function pasteScores(gradesObjectsArrayJson) {
    let gradesArray = gradesObjectsArrayJson

    if (!(gradesArray[0] === "[")) {
      gradesArray = formattClipboardContent(gradesArray)
    } else if (gradesArray[0] === "[") {
      // If clipboard content is already in a JSON array...
      gradesArray = JSON.parse(gradesObjectsArrayJson)
    }
    
    // REMOVE - New approach: detect assignment from focused input or last clicked input
    console.log("REMOVE - Looking for focused input or recently clicked input"); // REMOVE
    const focusedElement = document.activeElement; // REMOVE
    console.log("REMOVE - Focused element:", focusedElement); // REMOVE
    
    let assignmentId = null;
    let targetInput = null;
    
    // Check if currently focused element is a score input
    if (focusedElement && focusedElement.tagName === 'INPUT' && focusedElement.closest('td[id^="score"]')) {
      targetInput = focusedElement;
      const cellId = focusedElement.closest('td').id;
      console.log("REMOVE - Found focused score input, cell ID:", cellId); // REMOVE
      // Extract assignment ID from cell ID (format: score{assignmentId}_{sectionId}_{studentId})
      const match = cellId.match(/^score(\d+)_/);
      if (match) {
        assignmentId = match[1];
        console.log("REMOVE - Extracted assignment ID from focused input:", assignmentId); // REMOVE
      }
    }
    
    // If no focused input, look for any score input that was recently clicked
    if (!assignmentId) {
      console.log("REMOVE - No focused input found, checking for score inputs in grid"); // REMOVE
      const allScoreInputs = gradesWrapper.document.querySelectorAll('td[id^="score"] input'); // REMOVE
      console.log("REMOVE - Found score inputs:", allScoreInputs.length); // REMOVE
      
      if (allScoreInputs.length > 0) {
        // Use the first visible score input as a fallback, or prompt user to click one
        const visibleInputs = Array.from(allScoreInputs).filter(input => {
          const rect = input.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        
        if (visibleInputs.length > 0) {
          alert("Please click on a score input for the assignment you want to fill, then run the extension again.");
          return;
        }
      }
    }

    if (!assignmentId) {
      alert("Could not determine which assignment to fill. Please click on a score input for the assignment you want to update, then run the extension again.");
      return;
    }

    if (!Array.isArray(gradesArray)) {
      alert("Clipboard content is not formatted correctly")
      return
    }

    console.log("REMOVE - Using assignment ID:", assignmentId); // REMOVE

    //Get an array of student names
    const icStudents = gradesWrapper.document.querySelectorAll(".studentName a")

    function matchStudents(gradesArray, assignmentId) {
      // Get the IC student id for each matching student.
      const studentIdArray = []
      // Go through each student object in the grades array that came from the clipboard
      for (student of gradesArray) {
        for (ics of icStudents) {
          formattedIcs = ics.innerText.replace(",", "")

          if (formattedIcs.toLowerCase().includes(student.student.toLowerCase()) || ics.innerText.toLowerCase().includes(student.student.toLowerCase()) || similarity(formattedIcs.toLowerCase(), student.student.toLowerCase()) > 0.75) {
            // Extract student row ID from the student row structure
            const studentRow = ics.closest('tr[id^="studentTR"]');
            if (studentRow) {
              // Extract the student identifier from the row ID (format: studentTR{sectionId}_{studentId})
              const rowIdMatch = studentRow.id.match(/^studentTR(.+)$/);
              if (rowIdMatch) {
                const studentRowId = rowIdMatch[1];
                // Construct the score cell ID using the assignment ID and student row ID
                const scoreCellId = `score${assignmentId}_${studentRowId}`;
                console.log("REMOVE - Constructed score cell ID:", scoreCellId); // REMOVE
                
                studentIdArray.push({
                  id: scoreCellId,
                  points: +student.totalPoints,
                })
                break
              }
            }
          }
        }
      }

      return studentIdArray
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

    function updateGrades() {
      const scrollView = gradesWrapper.document.querySelector("#grid")
      scrollView.scrollTo({ top: 800, behavior: "smooth" })
      studentIdArr = matchStudents(gradesArray, assignmentId)

      console.log("REMOVE - Student ID array:", studentIdArr); // REMOVE

      const sleep = (time) => {
        return new Promise((resolve) => setTimeout(resolve, time))
      }
      setTimeout(() => {
        async function studentIdLoop() {
          for (item of studentIdArr) {
            const gradeInputTd = gradesWrapper.document.getElementById(item.id)
            console.log("REMOVE - Looking for cell:", item.id, "found:", gradeInputTd); // REMOVE
            if (!gradeInputTd) {
              console.log("can't find student ID: ", item.id)
              continue; // REMOVE - Continue to next student instead of breaking
            }

            const gradeInput = gradeInputTd.querySelector("input")
            if (gradeInput) {
              gradeInput.focus()
              gradeInput.value = item.points
              console.log("REMOVE - Set value for:", item.id, "to:", item.points); // REMOVE
            } else {
              console.log("REMOVE - No input found in cell:", item.id); // REMOVE
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
      const clipboardContent = await navigator.clipboard.readText() // will force prompt if permission not granted
      if (clipboardContent) {
        pasteScores(clipboardContent)
      } else if (!clipboardContent) {
        alert("No clipboard content")
      } else if (!permissionGranted) {
        alert("After granting access to your clipboard you will need to paste again.")
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
