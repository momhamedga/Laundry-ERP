; إضافات NSIS (Phase 15.5)
;
; electron-builder لا يكتب InstallLocation في مفتاح إلغاء التثبيت، فيظهر فارغاً
; في «إضافة/إزالة البرامج» وتعجز أدوات إدارة الأجهزة عن معرفة مكان التثبيت.
; (رُصد في تدقيق Phase 15D.)

!macro customInstall
  WriteRegStr SHCTX "${UNINSTALL_REGISTRY_KEY}" "InstallLocation" "$INSTDIR"
!macroend
