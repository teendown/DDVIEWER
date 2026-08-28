Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory

' 1. run-offline.bat을 콘솔 창 숨김(0) 모드로 백그라운드 실행
WshShell.Run "cmd /c """ & strPath & "\run-offline.bat""", 0, False

Set WshShell = Nothing
