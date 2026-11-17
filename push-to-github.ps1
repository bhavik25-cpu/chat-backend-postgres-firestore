param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl
)

$ErrorActionPreference = 'Stop'
git init
git branch -M main
git add .
git commit -m "Initial commit: chat backend with PostgreSQL and Firestore"
git remote add origin $RemoteUrl
git push -u origin main
