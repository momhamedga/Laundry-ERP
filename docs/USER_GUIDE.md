# User Guide (Operator)

For cashiers and front-desk staff using the desktop app or web dashboard.

## Signing in

1. Open Laundry ERP.
2. Enter your email and password (provided by your administrator).
3. If offline, previously cached reference data (services, prices) is still
   available so you can keep taking orders.

## Taking an order

1. Go to **Orders → New order**.
2. Select or create the **customer** (search by phone).
3. Add **service items** (e.g. shirt wash, suit iron) with quantities. The total is
   calculated for you.
4. Set the **due date** and any notes.
5. Save. The order gets a number and a status of **Received**.
6. Optionally **print** the receipt/ticket and, on receipt printers, **open the cash
   drawer**.

> Offline: you can do all of the above with no internet. The order is stored locally
> and uploaded automatically once you're back online.

## Taking a payment

1. Open the order → **Add payment**.
2. Enter the amount and method (cash, card, …).
3. The order's payment status updates to **Partial** or **Paid**.

## Order status flow

`Received → Inspecting → Washing → Drying → Ironing → Packing → Ready → Delivered`
(plus cancel/refund paths). Update status as garments move through the process.

## Barcodes & scanning

- Print item/label barcodes from the order.
- A **USB barcode scanner** (keyboard-wedge) can be used to look up orders/items —
  scan and the active screen reacts.

## Camera

- Attach a photo of an item (e.g. to document condition) — captured images are saved
  locally with the order.

## Sync indicator

- A status shows **online/offline** and how many items are **pending** upload.
- When online, pending items upload automatically. If something fails to sync, an
  administrator can review it under the sync/dead-letter view.

## Printing

- **Preview** prints show the OS print dialog; **silent** prints go straight to the
  configured printer.
- Configure your default receipt/label printer in **Settings** (see
  [ADMIN_GUIDE](ADMIN_GUIDE.md)).

> Hardware (thermal/label printers, cash drawer, scanner, camera) must be connected
> and configured on the workstation; verify each device on site.
