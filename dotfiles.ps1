Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy UnRestricted
iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))
choco install -y -r cmder
choco install -y -r nodejs.install
