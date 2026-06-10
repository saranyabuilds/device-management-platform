@echo off
setlocal

set BASE_DIR=%~dp0
set MAVEN_VERSION=3.9.11
set MAVEN_HOME=%BASE_DIR%\.mvn\apache-maven-%MAVEN_VERSION%
set MAVEN_ZIP=%BASE_DIR%\.mvn\apache-maven-%MAVEN_VERSION%-bin.zip
set MAVEN_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip

if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri '%MAVEN_URL%' -OutFile '%MAVEN_ZIP%'; Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%BASE_DIR%\.mvn' -Force"
)

"%MAVEN_HOME%\bin\mvn.cmd" %*
