# 서버 접근 테스트 스크립트

Write-Host "=== 서버 접근 테스트 ===" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "https://211.39.156.53"
$apiUrl = "$baseUrl/api"

# 1. 포트 연결 테스트
Write-Host "1. 포트 443 연결 테스트..." -ForegroundColor Yellow
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $tcpClient.Connect("211.39.156.53", 443)
    if ($tcpClient.Connected) {
        Write-Host "   ✅ 포트 443 연결 성공" -ForegroundColor Green
        $tcpClient.Close()
    }
} catch {
    Write-Host "   ❌ 포트 443 연결 실패: $_" -ForegroundColor Red
}

Write-Host ""

# 2. HTTPS 헬스체크 테스트
Write-Host "2. HTTPS 헬스체크 테스트..." -ForegroundColor Yellow
try {
    # SSL 인증서 검증 무시 (자체 서명 인증서용)
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
    
    $response = Invoke-WebRequest -Uri "$apiUrl/health" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ 헬스체크 성공 (상태 코드: $($response.StatusCode))" -ForegroundColor Green
    Write-Host "   응답: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ 헬스체크 실패: $_" -ForegroundColor Red
    Write-Host "   서버가 실행 중인지 확인하세요." -ForegroundColor Yellow
}

Write-Host ""

# 3. 로컬 접근 테스트
Write-Host "3. 로컬 접근 테스트 (localhost)..." -ForegroundColor Yellow
try {
    $localResponse = Invoke-WebRequest -Uri "https://localhost:443/api/health" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ 로컬 접근 성공 (상태 코드: $($localResponse.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 로컬 접근 실패: $_" -ForegroundColor Red
    Write-Host "   서버가 실행 중인지 확인하세요." -ForegroundColor Yellow
}

Write-Host ""

# 4. 서버 프로세스 확인
Write-Host "4. 서버 프로세스 확인..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ✅ Node.js 프로세스 실행 중: $($nodeProcesses.Count)개" -ForegroundColor Green
    $nodeProcesses | Format-Table Id,ProcessName,StartTime -AutoSize
} else {
    Write-Host "   ❌ Node.js 프로세스가 실행되지 않았습니다." -ForegroundColor Red
}

Write-Host ""

# 5. 포트 리스닝 확인
Write-Host "5. 포트 443 리스닝 확인..." -ForegroundColor Yellow
$listening = netstat -ano | findstr ":443" | findstr "LISTENING"
if ($listening) {
    Write-Host "   ✅ 포트 443에서 리스닝 중" -ForegroundColor Green
    Write-Host "   $listening" -ForegroundColor Gray
} else {
    Write-Host "   ❌ 포트 443에서 리스닝하는 프로세스가 없습니다." -ForegroundColor Red
    Write-Host "   서버를 시작하세요: npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 테스트 완료 ===" -ForegroundColor Cyan

