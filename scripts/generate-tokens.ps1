# SmartDuka Token Generator Script
# Generates secure tokens for environment configuration
# Usage: .\generate-tokens.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SmartDuka Secure Token Generator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to generate a secure random token
function Generate-SecureToken {
    param (
        [int]$Length = 64
    )
    $bytes = New-Object byte[] ($Length / 2)
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
}

# Function to generate a base64 encoded token
function Generate-Base64Token {
    param (
        [int]$Length = 32
    )
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Generate tokens
Write-Host "Generating secure tokens..." -ForegroundColor Yellow
Write-Host ""

# JWT Secret (256-bit / 64 hex chars)
$jwtSecret = Generate-SecureToken -Length 64
Write-Host "JWT_SECRET=" -NoNewline -ForegroundColor Green
Write-Host $jwtSecret

# Refresh Token Secret (256-bit)
$refreshTokenSecret = Generate-SecureToken -Length 64
Write-Host "REFRESH_TOKEN_SECRET=" -NoNewline -ForegroundColor Green
Write-Host $refreshTokenSecret

# Session Secret (256-bit)
$sessionSecret = Generate-SecureToken -Length 64
Write-Host "SESSION_SECRET=" -NoNewline -ForegroundColor Green
Write-Host $sessionSecret

# Encryption Key for sensitive data (256-bit AES)
$encryptionKey = Generate-Base64Token -Length 32
Write-Host "ENCRYPTION_KEY=" -NoNewline -ForegroundColor Green
Write-Host $encryptionKey

# CSRF Token Secret
$csrfSecret = Generate-SecureToken -Length 32
Write-Host "CSRF_SECRET=" -NoNewline -ForegroundColor Green
Write-Host $csrfSecret

# Password Reset Token Secret
$passwordResetSecret = Generate-SecureToken -Length 32
Write-Host "PASSWORD_RESET_SECRET=" -NoNewline -ForegroundColor Green
Write-Host $passwordResetSecret

# API Key for internal services
$internalApiKey = Generate-SecureToken -Length 48
Write-Host "INTERNAL_API_KEY=" -NoNewline -ForegroundColor Green
Write-Host $internalApiKey

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Copy these to your .env file" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Output in .env format
$envContent = @"
# Security Tokens - Generated $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# DO NOT COMMIT THESE TO VERSION CONTROL

# JWT Configuration
JWT_SECRET=$jwtSecret
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=30d

# Refresh Token
REFRESH_TOKEN_SECRET=$refreshTokenSecret

# Session
SESSION_SECRET=$sessionSecret

# Encryption (for M-Pesa credentials, etc.)
ENCRYPTION_KEY=$encryptionKey

# CSRF Protection
CSRF_SECRET=$csrfSecret

# Password Reset
PASSWORD_RESET_SECRET=$passwordResetSecret

# Internal API Key (for service-to-service communication)
INTERNAL_API_KEY=$internalApiKey
"@

Write-Host $envContent -ForegroundColor Gray
Write-Host ""

# Ask if user wants to save to file
$saveToFile = Read-Host "Save to .env.tokens file? (y/n)"
if ($saveToFile -eq "y" -or $saveToFile -eq "Y") {
    $outputPath = Join-Path $PSScriptRoot "..\apps\api\.env.tokens"
    $envContent | Out-File -FilePath $outputPath -Encoding UTF8
    Write-Host ""
    Write-Host "Tokens saved to: $outputPath" -ForegroundColor Green
    Write-Host "Remember to copy these values to your .env file!" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Security Recommendations:" -ForegroundColor Magenta
Write-Host "1. Never commit these tokens to version control" -ForegroundColor White
Write-Host "2. Use different tokens for development and production" -ForegroundColor White
Write-Host "3. Rotate tokens periodically (every 90 days recommended)" -ForegroundColor White
Write-Host "4. Store production tokens in a secure vault (e.g., Azure Key Vault)" -ForegroundColor White
Write-Host ""
