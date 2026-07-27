Get-Content backend/.env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)\s*$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}
Write-Host "Env vars loaded from backend/.env"