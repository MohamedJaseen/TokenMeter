param(
    [switch]$SkipDocker,
    [switch]$SkipLive,
    [switch]$SkipJava,
    [switch]$SkipSdk,
    [switch]$SkipFrontend,
    [switch]$SkipSecurity,
    [switch]$SkipQuota,
    [switch]$SkipBilling,
    [switch]$SkipLoad,
    [switch]$SkipBrowser
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = (Get-Command python -ErrorAction SilentlyContinue)
if (-not $py) {
    throw "Python is required but not available on PATH."
}

$args = @("$scriptDir/project_test_suite.py")
if ($SkipDocker) { $args += "--skip-docker" }
if ($SkipLive) { $args += "--skip-live" }
if ($SkipJava) { $args += "--skip-java" }
if ($SkipSdk) { $args += "--skip-sdk" }
if ($SkipFrontend) { $args += "--skip-frontend" }
if ($SkipSecurity) { $args += "--skip-security" }
if ($SkipQuota) { $args += "--skip-quota" }
if ($SkipBilling) { $args += "--skip-billing" }
if ($SkipLoad) { $args += "--skip-load" }
if ($SkipBrowser) { $args += "--skip-browser" }

& $py.Source @args
exit $LASTEXITCODE
