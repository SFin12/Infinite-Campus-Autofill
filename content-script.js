function fillGrades() {
  // Gets nested iframe within Infinite Campus where the grades are located
  const gradesWrapper = document.getElementById("main-workspace").contentWindow.document.getElementById("instruction-wrapper-iframe").contentWindow

  function pasteScores(gradesObjectsArrayJson) {
    let gradesArray = gradesObjectsArrayJson

    if (!(gradesArray[0] === "[")) {
      gradesArray = formattClipboardContent(gradesArray)
    } else if (gradesArray[0] === "[") {
      // If clipboard content is already in a JSON array...
      gradesArray = JSON.parse(gradesObjectsArrayJson)
    }
    // Check if an assignment is open to identify intended grade transfer target.
    const open = gradesWrapper.document.querySelector('[title="Collapse"]')

    if (!open) {
      alert("Expand the assignment to be graded")
      return
    } else if (!Array.isArray(gradesArray)) {
      alert("Clipboard content is not formatted correctly")
      return
    }
    // Gets the id of the assignment that is expanded.
    // const openId = open.parentElement.parentElement.parentElement.parentElement.id.split("TD")[1]
    const openId = open.closest("TD").id.split("TD")[1]

    if(!openId){
      alert("Assignment not found. If the assignment is expanded, try refreshing the page. If the problem persists, please contact the developer.")
      return
    }


    //Get an array of student
    const icStudents = gradesWrapper.document.querySelectorAll(".studentName a")

    function matchStudents(gradesArray, openId) {
      // Get the IC student id for each matching student.
      const studentIdArray = []
      // Go through each student object in the grades array that came from the clipboard
      for (student of gradesArray) {
        for (ics of icStudents) {
          formattedIcs = ics.innerText.replace(",", "")

          if (formattedIcs.toLowerCase().includes(student.student.toLowerCase()) || ics.innerText.toLowerCase().includes(student.student.toLowerCase()) || similarity(formattedIcs.toLowerCase(), student.student.toLowerCase()) > 0.75) {
            // Combines the open assignment id with each student id which is used to identify the correct score input element for each student.

            studentIdArray.push({
              id: "score" + openId + "_" + ics.parentElement.parentElement.parentElement.parentElement.parentElement.id.split("TR")[1],
              points: +student.totalPoints,
            })
            break
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
      studentIdArr = matchStudents(gradesArray, openId)

      const sleep = (time) => {
        return new Promise((resolve) => setTimeout(resolve, time))
      }
      setTimeout(() => {
        async function studentIdLoop() {
          for (item of studentIdArr) {
            const gradeInputTd = gradesWrapper.document.getElementById(item.id)
            if (!gradeInputTd) {
              console.log("can't find student ID: ", item.id)
            }

            const gradeInput = gradeInputTd.querySelector("input")
            gradeInput.focus()
            gradeInput.value = item.points
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
fillGrades()
