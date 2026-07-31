# Hardware Validation Checklists

These are **field QA checklists** to run on the target workstation with the actual
devices connected. They are **not** simulated. In the current build environment
**no hardware is present**, so every item below is **NOT TESTED** until performed on
site. Record PASS/FAIL with date, tester, device model, and notes.

General preconditions for every device:
- Device installed with the correct Windows driver; visible in **Settings →
  Printers & scanners** (or Device Manager for HID).
- The device is selected/configured in the app **Settings** where applicable.

---

## 1. Receipt printer (80mm, silent)
- ☐ Appears in the app's printer list.
- ☐ Selected as the receipt printer with the correct paper profile (thermal 80).
- ☐ **Silent print** of a receipt produces correct output (no OS dialog).
- ☐ Arabic (RTL) text prints correctly, not mojibake.
- ☐ Totals/barcode/QR render and are legible.
- ☐ Reprint produces identical output.

## 2. Thermal printer (58mm)
- ☐ Appears and selectable with the thermal-58 profile.
- ☐ Silent print fits the 58mm width (no clipping/wrap issues).
- ☐ Cut/feed behaves correctly.

## 3. A4 printer
- ☐ Appears in the printer list.
- ☐ **Preview** print shows the OS dialog with correct A4 layout.
- ☐ **PDF export** of an invoice opens/saves a valid A4 PDF.
- ☐ Full invoice (header, items, totals, footer) prints without clipping.

## 4. Label printer (barcode labels)
- ☐ Appears and selectable as the label printer.
- ☐ A generated **Code128/EAN** label prints at the correct size.
- ☐ The printed label **scans back** correctly (round-trip with the scanner).
- ☐ QR labels scan and resolve to the expected value.

## 5. USB barcode scanner (keyboard-wedge)
- ☐ Recognized as an HID keyboard input device.
- ☐ Scanning a barcode into a focused field enters the value + terminator.
- ☐ Scanning triggers order/item lookup on the active screen.
- ☐ Rapid scans are captured as whole codes (not split by human-typing timing).
- ☐ EAN/UPC checksums validate; invalid codes are rejected/flagged.

## 6. Camera (image capture)
- ☐ Camera permission granted; device selectable in Settings.
- ☐ Live preview renders.
- ☐ Capture saves an image locally and attaches to the order.
- ☐ Captured file opens and is the correct image.

## 7. Cash drawer (via receipt printer / network)
- ☐ Configured (enabled + host/port/pin for networked drawers).
- ☐ Opens on payment completion.
- ☐ Opens on receipt print (if configured).
- ☐ Does **not** open spuriously.

## 8. Network printer
- ☐ Reachable at its host/IP:port (e.g. 9100 raw).
- ☐ Appears/targetable from the app.
- ☐ Silent/raw (ESC/POS) print produces correct output.
- ☐ Behaves correctly when the printer is offline (clear error, no hang).

---

## Sign-off

| Device | Model | Result (PASS/FAIL) | Date | Tester | Notes |
|---|---|---|---|---|---|
| Receipt printer | | | | | |
| Thermal 58mm | | | | | |
| A4 printer | | | | | |
| Label printer | | | | | |
| USB scanner | | | | | |
| Camera | | | | | |
| Cash drawer | | | | | |
| Network printer | | | | | |

> **Current status in this repository: NOT TESTED** (no devices in the build/CI
> environment). The software paths these devices feed (silent/PDF printing engine,
> barcode generation + checksum validation, scan-event handling, capture
> persistence) are covered by automated tests; the physical device loop must be
> certified here before commercial deployment.
