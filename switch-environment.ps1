# Quick Environment Switcher (Optional)
# You can use this PowerShell script to quickly switch between environments
# Run this script from the root of your project

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("local", "uat", "production")]
    [string]$Environment
)

Write-Host "🔧 Switching to $Environment environment..." -ForegroundColor Cyan

# Define file paths
$frontendApiFile = "frontend/src/lib/api.js"
$frontendAuthFile = "frontend/src/lib/azureAuth.js"
$backendAppFile = "backend/app.py"

# Function to update a file with environment-specific configuration
function Update-EnvironmentConfig {
    param($FilePath, $Environment)
    
    if (-not (Test-Path $FilePath)) {
        Write-Host "❌ File not found: $FilePath" -ForegroundColor Red
        return
    }
    
    $content = Get-Content $FilePath -Raw
    
    # Comment out all environment blocks first
    $content = $content -replace '^(const API_BASE_URL|export const isDevelopment|cors_origins)', '// $1'
    $content = $content -replace '^(// )(const API_BASE_URL|export const isDevelopment|cors_origins)', '// $2'
    
    # Uncomment the specific environment block
    switch ($Environment) {
        "local" {
            # Uncomment lines after "🏠 LOCAL DEVELOPMENT"
            $content = $content -replace '(?<=🏠 LOCAL DEVELOPMENT[^\r\n]*[\r\n]+)// (const API_BASE_URL[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🏠 LOCAL DEVELOPMENT[^\r\n]*[\r\n]+)// (const ENVIRONMENT[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🏠 LOCAL DEVELOPMENT[^\r\n]*[\r\n]+)// (export const isDevelopment[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🏠 LOCAL DEVELOPMENT[^\r\n]*[\r\n]+)// (export const isAzureSWA[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🏠 LOCAL DEVELOPMENT[^\r\n]*[\r\n]+)// (cors_origins[^\r\n]*)', '$1'
        }
        "uat" {
            # Uncomment lines after "🧪 UAT ENVIRONMENT"
            $content = $content -replace '(?<=🧪 UAT ENVIRONMENT[^\r\n]*[\r\n]+)// (const API_BASE_URL[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🧪 UAT ENVIRONMENT[^\r\n]*[\r\n]+)// (const ENVIRONMENT[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🧪 UAT ENVIRONMENT[^\r\n]*[\r\n]+)// (export const isDevelopment[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🧪 UAT ENVIRONMENT[^\r\n]*[\r\n]+)// (export const isAzureSWA[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🧪 UAT ENVIRONMENT[^\r\n]*[\r\n]+)// (cors_origins[^\r\n]*)', '$1'
        }
        "production" {
            # Uncomment lines after "🚀 PRODUCTION ENVIRONMENT"
            $content = $content -replace '(?<=🚀 PRODUCTION ENVIRONMENT[^\r\n]*[\r\n]+)// (const API_BASE_URL[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🚀 PRODUCTION ENVIRONMENT[^\r\n]*[\r\n]+)// (const ENVIRONMENT[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🚀 PRODUCTION ENVIRONMENT[^\r\n]*[\r\n]+)// (export const isDevelopment[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🚀 PRODUCTION ENVIRONMENT[^\r\n]*[\r\n]+)// (export const isAzureSWA[^\r\n]*)', '$1'
            $content = $content -replace '(?<=🚀 PRODUCTION ENVIRONMENT[^\r\n]*[\r\n]+)// (cors_origins[^\r\n]*)', '$1'
        }
    }
    
    Set-Content -Path $FilePath -Value $content -NoNewline
    Write-Host "✅ Updated $FilePath" -ForegroundColor Green
}

# Update all configuration files
Write-Host "📁 Updating configuration files..." -ForegroundColor Yellow
Update-EnvironmentConfig $frontendApiFile $Environment
Update-EnvironmentConfig $frontendAuthFile $Environment
Update-EnvironmentConfig $backendAppFile $Environment

Write-Host ""
Write-Host "🎉 Environment switched to: $Environment" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
switch ($Environment) {
    "local" {
        Write-Host "  1. Run 'npm run dev' in the frontend folder" -ForegroundColor White
        Write-Host "  2. Run 'python app.py' in the backend folder" -ForegroundColor White
    }
    "uat" {
        Write-Host "  1. Commit and push to 'uat' or 'testing' branch" -ForegroundColor White
        Write-Host "  2. Check GitHub Actions for deployment status" -ForegroundColor White
    }
    "production" {
        Write-Host "  1. Commit and push to 'main' branch" -ForegroundColor White
        Write-Host "  2. Check GitHub Actions for deployment status" -ForegroundColor White
    }
}

# Usage:
# .\switch-environment.ps1 -Environment local
# .\switch-environment.ps1 -Environment uat  
# .\switch-environment.ps1 -Environment production