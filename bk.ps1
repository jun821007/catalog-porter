$msg = $args[0]; if (-not $msg) { $msg = "未命名存檔 " + (Get-Date -Format "HH:mm") }; git add .; git commit -m "$msg"
