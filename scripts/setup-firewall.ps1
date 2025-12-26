# Windows Server 방화벽 설정 스크립트
# 관리자 권한으로 실행 필요

Write-Host "=== Windows Server 방화벽 설정 ===" -ForegroundColor Cyan
Write-Host ""

$ruleName = "API Doc Manager HTTPS (Port 443)"

# 기존 규칙 확인
Write-Host "기존 방화벽 규칙 확인 중..." -ForegroundColor Yellow
$existingRule = netsh advfirewall firewall show rule name="$ruleName" 2>&1

if ($existingRule -match "규칙 이름") {
    Write-Host "✅ 방화벽 규칙이 이미 존재합니다: $ruleName" -ForegroundColor Green
    Write-Host ""
    Write-Host "규칙 상세:" -ForegroundColor Cyan
    netsh advfirewall firewall show rule name="$ruleName"
} else {
    Write-Host "방화벽 규칙 추가 중..." -ForegroundColor Yellow
    
    try {
        # 인바운드 규칙 추가
        netsh advfirewall firewall add rule `
            name="$ruleName" `
            dir=in `
            action=allow `
            protocol=TCP `
            localport=443 `
            description="API Doc Manager HTTPS 서버용 포트 443 인바운드 규칙"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ 방화벽 규칙 추가 완료: $ruleName" -ForegroundColor Green
            Write-Host ""
            Write-Host "추가된 규칙:" -ForegroundColor Cyan
            netsh advfirewall firewall show rule name="$ruleName"
        } else {
            Write-Host "❌ 방화벽 규칙 추가 실패" -ForegroundColor Red
            Write-Host "관리자 권한으로 실행했는지 확인하세요." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ 오류 발생: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "수동 설정 방법:" -ForegroundColor Yellow
        Write-Host "1. Windows 방화벽 고급 설정 열기" -ForegroundColor White
        Write-Host "2. 인바운드 규칙 > 새 규칙" -ForegroundColor White
        Write-Host "3. 포트 > TCP > 특정 로컬 포트: 443" -ForegroundColor White
        Write-Host "4. 연결 허용 > 모든 프로필 체크 > 이름: $ruleName" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "=== 방화벽 상태 확인 ===" -ForegroundColor Cyan
netsh advfirewall show allprofiles state

