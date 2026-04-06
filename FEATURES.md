# Yasir Sales - Complete Feature Documentation

## 📱 App Overview
A sales management app built with Expo Router + SQLite. Sky blue theme (`#0EA5E9`). Supports multi-business management, cursor-based pagination, and MVR (Maldivian Rufiyaa) currency.

---

## 1. Navigation & Global Features

### Root Layout
- Provider stack: `GestureHandlerRootView` → `SafeAreaProvider` → `SafeAreaWrapper` → `DatabaseProvider` → `ToastProvider` → `AppContent`
- Loading state: centered "Loading..." text while DB/fonts initialize
- Error state: red "Error" heading with message
- Light theme via React Navigation `ThemeProvider`
- StatusBar: `style="dark"`, translucent
- Safe area padding (iOS: 28px bottom, Android: 12px)

### Custom Tab Bar
- **Floating pill design**: `borderRadius: 24`, height 72, semi-transparent background
- **Shadow**: elevated above content with drop shadow
- **Active tab**: blue background pill, white text/icon
- **Haptic feedback** on iOS tab press (`Haptics.impactAsync`)
- **5 tabs**: Dashboard (`space-dashboard`), Sales (`receipt-long`), Inventory (`category`), Finance (`account-balance-wallet`), Reports (`bar-chart`)

---

## 2. Dashboard Screen

### Capital Card
- Business name button (top-left) with store icon + name + dropdown arrow
- Settings button (top-right) → navigates to `/business-settings`
- Shows initial capital & remaining capital in MVR
- **Long-press** to edit capital → modal with "Amount (MVR)" input
- Remaining capital turns **red** when negative

### Hero Card
- "Today's Sales" total with transaction count
- **"New Sale" button** with `point-of-sale` icon → navigates to `/new-sale`

### Stats Grid
- **Sales card**: total transactions, tap → navigates to `/sales`
- **Today's Revenue card**: MVR amount

### Recent Activity
- Up to 10 recent sales as `TransactionItem` components
- "View All" link → navigates to `/sales`
- **Empty state**: "No activity yet" + "Make a new sale" button

### Business Management
- **Business switcher modal**: FlatList with radio buttons, delete buttons, "Add New Business" footer
- **Add Business modal**: TextInput with "Business name" placeholder
- **Delete confirmation**: Must type exact business name to confirm (button disabled until match)
- Warning icon on delete modal

### Loading States
- `DashboardSkeleton`: skeleton placeholders for all sections
- Pull-to-refresh with primary color tint

### Icons Used
`store`, `settings`, `account-balance-wallet`, `arrow-drop-down`, `point-of-sale`, `trending-up`, `radio-button-checked`, `radio-button-unchecked`, `delete`, `add`, `check`, `close`, `warning`, `shopping-bag`

---

## 3. Sales Screen

### Header
- Title "Sales", transaction count, total MVR
- **"+" button** → `/new-sale`
- **Refresh button**
- **Date filter toggle** (calendar icon)

### Date Filter Panel
- "From" and "To" native `DateTimePicker` pickers
- "Clear" and "Apply" buttons

### Sale Cards
- Sale ID badge (colored pill), payment chip with icon (`payments`/`account-balance`/`assignment-late`) + label ("Cash"/"Transfer"/"Credit"), optional tax chip
- Date timestamp
- Items list: product name, quantity (xN), item total
- Summary: Subtotal, Tax, Total (bold)
- **Edit button** → `/sale-detail`
- **Delete button** → confirmation alert ("Deleting this sale will restore stock")
- **Long-press** → Alert with "Share Receipt" option

### Pagination
- Infinite scroll (`onEndReached`), page size 50
- "Loading more..." footer with `ActivityIndicator`

### Receipt Sharing
- Hidden `ReceiptView` rendered off-screen (`left: -9999`)
- Captured via `ViewShot` as PNG, shared via `expo-sharing`

### Empty States
- "No sales yet" / "Tap the + button to make a sale"
- "No results" / "Try adjusting the date filter"

### Loading
- `SalesSkeleton`: 7 skeleton rows with circle + text placeholders

---

## 4. Inventory Screen

### Hero Card
- "Inventory Value" label, "Stock Overview" title
- Item count + low stock count stats
- Sell/Buy inventory values

### Controls
- **Search button** (magnifying glass) → toggles search input
- **"+" button** (blue) → toggles add product form (top sheet)
- **Search input**: "Search products...", auto-focus, clear button, 300ms debounce
- **Filter chips**: "All", "Low Stock" (with warning icon, filters to `stock <= 5`)

### Product Cards
- Thumbnail (80x80) with product image or icon
- **"Low Stock" badge** (absolute, top-left) when `stock <= 5`
- **"Service" badge** for service products
- Product name (right-aligned, fontSize 20)
- Sell price (blue) and Buy price rows
- **Stock +/- buttons** (delta of 1, prevents negative)
- **Tap card** → toggle inline edit form
- **Edit button** (pencil) → toggles inline `ProductForm`
- **Delete button** → confirmation alert

### Add/Edit Product Form
- **Type selector**: "Item" (`inventory-2`) or "Service" (`miscellaneous-services`) chips
- **Image picker**: opens library (1:1 aspect, 0.7 quality), shows preview, "Remove" button
- **Inputs**: Name, Sell Price, Buy Price, Stock (items only)
- Validation: "Name is required", "Sell Price is required"
- Cancel/Save buttons

### Empty States
- "No items yet" + "Add Item" button
- "No results" for search/filter

### Loading
- `InventorySkeleton`: 6 skeleton rows with thumbnail + text
- Pull-to-refresh

### Icons Used
`search`, `close`, `add`, `inventory-2`, `warning`, `miscellaneous-services`, `image`, `add-a-photo`, `remove`, `edit`, `delete-outline`, `expand-less`, `check`

---

## 5. Finance Screen

### Tab Switcher
- **"Income"** (`trending-up`) / **"Expenses"** (`trending-down`)

### Income Tab
- Header: "Income", record count, total MVR
- Date filter panel (same From/To pickers)
- **Manual income form**: Title + Amount inputs, Submit button
- **List items**:
  - Manual incomes: `payments` icon (teal), title, timestamp, "+MVR" (green), edit/delete
  - Sale records: `shopping-bag` icon, "Sale #{id}" with "Sale" badge, item count + payment method

### Expenses Tab
- Header: "Expenses" (red background), record count, total MVR
- Date filter panel
- **Expense form**: 5 type chips with icons (Stock/Rent/Utilities/Transport/Other), Title, Amount inputs
- **List items**:
  - Stock cost auto-entry: `inventory-2` icon (rose), "Stock Expenses" badge
  - Manual expenses: `trending-down` icon, title, timestamp + type label, "-MVR" (rose), edit/delete

### Delete with Undo
- Toast notification: `"{title}" deleted` with "Undo" action button (3000ms)

### Empty States
- Income: "No Incomes Yet" with `account-balance-wallet`
- Expenses: "No Expenses Yet" with `money-off`

### Loading
- `FinanceSkeleton`: summary cards + 5 skeleton list items

### Icons Used
`trending-up`, `trending-down`, `date-range`, `refresh`, `add`, `close`, `payments`, `shopping-bag`, `inventory-2`, `money-off`, `account-balance-wallet`, `edit`, `delete`, `home`, `bolt`, `local-shipping`, `more-horiz`

---

## 6. Reports Screen

### Header
- "Reports" title, "Month Year" subtitle
- **Year dropdown**: shows 5 years (current ±2), chevron rotates up/down

### Month Selector
- Horizontal scroll, full month names (January–December)
- Active month = blue background + white text

### Monthly Summary Cards
- **Income card** (primaryContainer bg): MVR amount
- **Expenses card** (primary bg): MVR amount
- **Profit card** (outlined): color-coded green/red

### Sales Statistics
- `receipt-long` icon: sales count
- `shopping-bag` icon: total units sold

### Top Selling Products
- Ranked list: #1, #2, etc., product name, "X units", "MVR" revenue
- Only shown when products exist

### Year Summary
- Yearly Income (green, `arrow-upward`)
- Yearly Expenses (red, `arrow-downward`)
- Yearly Profit (color-coded, `account-balance-wallet`)

### Loading
- `ReportsSkeleton`: header, summary cards, 4 top product rows

### Icons Used
`keyboard-arrow-up`, `keyboard-arrow-down`, `trending-up`, `trending-down`, `account-balance-wallet`, `receipt-long`, `shopping-bag`, `arrow-upward`, `arrow-downward`

---

## 7. New Sale / POS Screen

### POS View
- **Search bar**: "Search products...", 300ms debounce, paginated loading
- **Product cards** (140px, horizontal scroll rows):
  - Tap to add to cart
  - Disabled when out of stock (opacity 0.5, overlay)
  - Stock badge (bottom-left): number or ∞ for services
  - "X in cart" badge when in cart (blue border + badge)
  - Image thumbnail or `image` icon
- **"Load More Products" button** for pagination
- **"Clear" button** for cart

### Cart Panel (horizontal scroll)
- Cart items (110px): remove button (X), quantity -/+, item total
- Stock validation alert: "Only X available" when exceeding

### Tax & Payment
- **Tax selector**: "0%" default, custom tax button (pencil) → "Tax percentage" input
- **Payment buttons**: Cash (`#0EA5E9`), Transfer (`#F43F5E`), Credit/Dharani (`#F59E0B`)
- **"Complete Sale" button**: disabled when empty/loading, shows "Processing..."

### Receipt View (after sale)
- Close button (X, top-right)
- Green checkmark circle (64px)
- Sale ID + timestamp
- Item list: "name xquantity" + total
- Summary: Subtotal, Tax (with rate %), Total
- Payment badge with icon/label
- **"Back to Sales" button**

### Empty States
- "No products found", "Loading...", "Cart is empty" with shopping-cart icon

### Error Handling
- "Out of Stock" alert
- "Sale Failed - Not enough stock"
- "Error - Something went wrong"

### Icons Used
`search`, `close`, `image`, `add`, `expand-more`, `shopping-cart`, `remove`, `payments`, `account-balance`, `assignment-late`, `arrow-forward`, `arrow-back`, `check`, `edit`

---

## 8. Sale Detail Screen

### Header Banner
- Sale ID + full timestamp
- Close button → `router.back()`

### Editable Items
- Quantity controls: -/+/remove buttons
- Stock validation alert: "Only X available"

### Payment & Tax
- Payment method buttons: Cash/Transfer/Credit (auto-save on change)
- Tax selector: same as New Sale (0% + custom)

### Summary
- Subtotal, Tax, Total

### Footer
- **Delete button**: confirmation alert ("restoring stock")
- **Save Changes button**: shows "Saving...", success alert on save

### Loading
- `SaleDetailSkeleton`: header banner, 3 item rows, summary card

### Error States
- "Sale not found" → skeleton indefinitely
- "Error - Failed to update/delete sale"

---

## 9. Business Settings Screen

### Header Card
- "Business Info" title, "Business Settings" subtitle
- **Save button** (appears when `hasChanges`)
- **Close button**: unsaved changes → alert "Unsaved Changes" with Cancel/Leave

### Editable Fields
- Business Name (`store` icon)
- Account Name (`person` icon)
- Account Number (`credit-card` icon)
- Viber Number (`chat` icon)

### Backup & Restore
- Button → navigates to `/backup-cloud`

### Footer
- "Developed by Ahmed Sunil"

### Loading
- `BusinessSettingsSkeleton`: header + 4 field skeletons

### Toast
- "Business info saved" (3000ms)

---

## 10. Backup & Restore Screen

### Create Backup Card
- Description + feature list (checkmarks)
- **"Create Backup" button**: confirmation alert → progress toast → ZIP + system share sheet

### Restore Backup Card
- Description + warning card
- **"Select Backup File" button**: warning about data replacement → document picker → restore → auto-navigate on success

### How It Works Card
- Backup/Restore/Tips sections

### Loading Overlay
- Full-screen semi-transparent overlay with `ActivityIndicator` + progress text

### Toasts
- "Creating backup..." / "Backup created successfully!" (4000ms)
- "Restoring backup..." / "Backup restored successfully!" (4000ms)

### Errors
- "Backup Failed" / "Restore Failed" alerts with error message

### Icons Used
`backup`, `archive`, `restore`, `folder-open`, `info`, `check-circle`, `warning`

---

## 11. Modal Screen (Placeholder)
- "This is a modal" text
- "Go to home screen" link using `dismissTo`

---

## 🔧 Global Components & Infrastructure

### Reusable Components
- **Card**: `default`, `elevated`, `primary`, `tertiary` variants
- **Button**: `primary`, `secondary`, `outline`, loading/disabled states
- **Skeleton**: animated shimmer (opacity oscillation 0.3–0.7, 1000ms)
- **TransactionItem**: icon box, title, subtitle, color-coded amount
- **ReceiptView**: 320px, torn-paper zigzag edges, payment colors
- **StatCard**: icon + label + value + badge
- **ProgressBar**: label + percentage + colored bar
- **Collapsible**: expandable with chevron rotation
- **HelloWave**: animated waving hand (4 iterations)

### State Management
- **DatabaseProvider**: SQLite v4 initialization, migration, corruption recovery
- **ToastProvider**: animated fade-in/out (200ms), auto-dismiss, undo action
- **QueryCache**: TTL-based (30s default), pattern-based invalidation
- **StockStore**: facade over DB layer, pagination, validation

### Database
- Tables: `businesses`, `products`, `sales`, `sale_items`, `expenses`, `income`, `settings`
- Archive tables for old records (>12 months, >100K threshold)
- WAL mode, foreign_keys=OFF, synchronous=NORMAL
- Cursor-based pagination (limit 50)
- 300ms debounce search with LIKE queries

### Key Patterns
- MVR currency formatting: `MVR {amount.toLocaleString()}`
- Timestamp display: short month, day, year + 12hr time
- Platform differences: iOS safe area padding, DateTimePicker spinner mode
- Color system: surface elevation hierarchy
