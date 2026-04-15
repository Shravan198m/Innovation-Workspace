$ErrorActionPreference = "Stop"

$outputRoot = if ($PSScriptRoot -and $PSScriptRoot.Trim()) {
  $PSScriptRoot
} else {
  (Get-Location).Path
}

function Assert-Equal {
  param(
    [string]$Name,
    $Actual,
    $Expected
  )

  if ($Actual -ne $Expected) {
    throw "$Name failed. Expected: $Expected, Actual: $Actual"
  }
}

$baseUrl = "http://localhost:5000/api"
$results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
  param(
    [string]$Step,
    [string]$Status,
    [string]$Details
  )

  $results.Add([PSCustomObject]@{
    Step = $Step
    Status = $Status
    Details = $Details
    Time = (Get-Date).ToString("s")
  })
}

try {
  $health = Invoke-WebRequest -UseBasicParsing "$baseUrl/health"
  Assert-Equal -Name "Health status" -Actual $health.StatusCode -Expected 200
  Add-Result -Step "Health" -Status "PASS" -Details "API reachable"

  $studentEmail = "student_" + [guid]::NewGuid().ToString("N").Substring(0, 8) + "@example.com"
  $mentorEmail = "mentor_" + [guid]::NewGuid().ToString("N").Substring(0, 8) + "@example.com"

  $studentReg = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/register" -ContentType "application/json" -Body (@{
      name = "Demo Student"
      email = $studentEmail
      password = "secret123"
      role = "STUDENT"
    } | ConvertTo-Json)

  if (-not $studentReg.token) {
    throw "Student registration did not return token"
  }
  Add-Result -Step "Register student" -Status "PASS" -Details $studentEmail

  $mentorReg = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/register" -ContentType "application/json" -Body (@{
      name = "Demo Mentor"
      email = $mentorEmail
      password = "secret123"
      role = "MENTOR"
    } | ConvertTo-Json)

  if (-not $mentorReg.token) {
    throw "Mentor registration did not return token"
  }
  Add-Result -Step "Register mentor" -Status "PASS" -Details $mentorEmail

  $studentHeaders = @{ Authorization = "Bearer $($studentReg.token)" }
  $mentorHeaders = @{ Authorization = "Bearer $($mentorReg.token)" }

  $project = Invoke-RestMethod -Method Post -Uri "$baseUrl/projects" -Headers $mentorHeaders -ContentType "application/json" -Body (@{
      name = "Production Demo Project"
      mentor = "Demo Mentor"
      department = "CSE"
      teamCount = 2
      teamMembers = @(
        @{ name = "Demo Student"; usn = "USN-DEMO-01"; email = $studentEmail }
      )
    } | ConvertTo-Json -Depth 5)

  if (-not $project.id) {
    throw "Project creation failed"
  }
  $projectId = $project.id
  Add-Result -Step "Create project" -Status "PASS" -Details "projectId=$projectId"

  $task = Invoke-RestMethod -Method Post -Uri "$baseUrl/tasks" -Headers $studentHeaders -ContentType "application/json" -Body (@{
      title = "Prepare architecture slides"
      status = "TASK"
      projectId = $projectId
    } | ConvertTo-Json)

  if (-not $task.id) {
    throw "Task creation failed"
  }
  Add-Result -Step "Create task" -Status "PASS" -Details "taskId=$($task.id)"

  $report = Invoke-RestMethod -Method Post -Uri "$baseUrl/reports" -Headers $studentHeaders -ContentType "application/json" -Body (@{
      projectId = $projectId
      type = "DAILY"
      content = "Completed initial setup and API integration."
    } | ConvertTo-Json)

  Assert-Equal -Name "Report status" -Actual $report.status -Expected "PENDING"
  Add-Result -Step "Submit daily report" -Status "PASS" -Details "reportId=$($report.id)"

  $reportReviewed = Invoke-RestMethod -Method Put -Uri "$baseUrl/reports/$($report.id)" -Headers $mentorHeaders -ContentType "application/json" -Body (@{
      status = "APPROVED"
      mentorComment = "Good progress"
    } | ConvertTo-Json)

  Assert-Equal -Name "Report reviewed status" -Actual $reportReviewed.status -Expected "APPROVED"
  Add-Result -Step "Approve report" -Status "PASS" -Details "reportId=$($report.id)"

  $budget = Invoke-RestMethod -Method Post -Uri "$baseUrl/budgets/$projectId" -Headers $studentHeaders -ContentType "application/json" -Body (@{
      itemName = "Sensor Module"
      qty = 10
      vendor1Name = "Vendor A"
      vendor1Amount = 1200
      vendor2Name = "Vendor B"
      vendor2Amount = 1150
      vendor3Name = "Vendor C"
      vendor3Amount = 1180
      remarks = "Lab requirement"
    } | ConvertTo-Json)

  if (-not $budget.id) {
    throw "Budget entry creation failed"
  }
  Add-Result -Step "Create budget entry" -Status "PASS" -Details "budgetId=$($budget.id)"

  $budgetApproved = Invoke-RestMethod -Method Put -Uri "$baseUrl/budgets/$($budget.id)" -Headers $mentorHeaders -ContentType "application/json" -Body (@{
      itemName = $budget.itemName
      qty = $budget.qty
      vendor1Name = $budget.vendor1Name
      vendor1Amount = $budget.vendor1Amount
      vendor2Name = $budget.vendor2Name
      vendor2Amount = $budget.vendor2Amount
      vendor3Name = $budget.vendor3Name
      vendor3Amount = $budget.vendor3Amount
      finalVendorDetails = $budget.finalVendorDetails
      finalAmount = $budget.finalAmount
      remarks = $budget.remarks
      poNumber = $budget.poNumber
      status = "APPROVED"
    } | ConvertTo-Json)

  Assert-Equal -Name "Budget approved status" -Actual $budgetApproved.status -Expected "APPROVED"
  Add-Result -Step "Approve budget" -Status "PASS" -Details "budgetId=$($budget.id)"

  $document = Invoke-RestMethod -Method Post -Uri "$baseUrl/documents" -Headers $studentHeaders -ContentType "application/json" -Body (@{
      projectId = $projectId
      fileName = "dpr-final.pdf"
      category = "DPR"
      fileUrl = "https://example.com/dpr-final.pdf"
    } | ConvertTo-Json)

  if (-not $document.id) {
    throw "Document creation failed"
  }
  Add-Result -Step "Upload document metadata" -Status "PASS" -Details "documentId=$($document.id)"

  $docApproved = Invoke-RestMethod -Method Put -Uri "$baseUrl/documents/$($document.id)/status" -Headers $mentorHeaders -ContentType "application/json" -Body (@{ status = "APPROVED" } | ConvertTo-Json)
  Assert-Equal -Name "Document approved status" -Actual $docApproved.status -Expected "APPROVED"
  Add-Result -Step "Approve document" -Status "PASS" -Details "documentId=$($document.id)"

  $notifications = Invoke-RestMethod -Method Get -Uri "$baseUrl/notifications/me" -Headers $studentHeaders
  Add-Result -Step "Fetch notifications" -Status "PASS" -Details "count=$($notifications.Count)"

  $activity = Invoke-RestMethod -Method Get -Uri "$baseUrl/activity/$projectId" -Headers $mentorHeaders
  Add-Result -Step "Fetch activity log" -Status "PASS" -Details "count=$($activity.Count)"

  $resultsPath = Join-Path $outputRoot "WALKTHROUGH_TEST_RESULTS.json"
  $results | ConvertTo-Json -Depth 5 | Set-Content -Path $resultsPath

  Write-Host "All walkthrough checks passed." -ForegroundColor Green
  Write-Host "Results saved to $resultsPath" -ForegroundColor Cyan
  $results | Format-Table -AutoSize
}
catch {
  Add-Result -Step "Run" -Status "FAIL" -Details $_.Exception.Message
  $resultsPath = Join-Path $outputRoot "WALKTHROUGH_TEST_RESULTS.json"
  $results | ConvertTo-Json -Depth 5 | Set-Content -Path $resultsPath
  Write-Host "Walkthrough failed: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Partial results saved to $resultsPath" -ForegroundColor Yellow
  exit 1
}
