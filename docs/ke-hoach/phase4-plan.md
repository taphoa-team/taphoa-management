# Phase 4: Báo cáo + Giảm giá + Lịch sử giá — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm hệ thống báo cáo doanh thu/lợi nhuận, giới hạn giảm giá cho staff, xem lịch sử giá, và xuất Excel.

**Architecture:** Backend Go handlers query trực tiếp từ invoices/invoice_items bằng GORM aggregation. Frontend dùng recharts cho biểu đồ, Ant Design Tabs cho 3 tab báo cáo. Excel export ở backend dùng excelize.

**Tech Stack:** Go/Gin/GORM (backend), React/TypeScript/Ant Design/recharts (frontend), excelize (Excel export)

---

## File Map

### Backend — files mới
| File | Mục đích |
|------|----------|
| `backend/handlers/report.go` | 4 report handlers + 3 export handlers |
| `backend/handlers/price_history.go` | API lấy lịch sử giá theo product |

### Backend — files sửa
| File | Thay đổi |
|------|----------|
| `backend/routes/routes.go` | Thêm report routes (admin) + price history route |
| `backend/handlers/invoice.go` | Thêm validate giảm giá 20% cho staff |

### Frontend — files mới
| File | Mục đích |
|------|----------|
| `frontend/src/pages/ReportsPage.tsx` | Trang báo cáo 3 tab |

### Frontend — files sửa
| File | Thay đổi |
|------|----------|
| `frontend/src/App.tsx` | Thêm route /reports + import |
| `frontend/src/components/AppLayout.tsx` | Thêm menu "Báo cáo" (admin only) |
| `frontend/src/types/index.ts` | Thêm report + price history types |
| `frontend/src/pages/POSPage.tsx` | Giới hạn discount 20% cho staff |
| `frontend/src/pages/ProductsPage.tsx` | Thêm icon + modal lịch sử giá |
| `frontend/package.json` | Thêm recharts |

---

## Task 1: Backend — Report handlers (revenue + profit)

**Files:**
- Create: `backend/handlers/report.go`

- [ ] **Step 1: Tạo file report.go với GetRevenueReport handler**

```go
package handlers

import (
	"net/http"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

// RevenueDataPoint — doanh thu theo ngày
type RevenueDataPoint struct {
	Date         string `json:"date"`
	Revenue      int    `json:"revenue"`
	InvoiceCount int    `json:"invoice_count"`
}

// RevenueReport — response cho /reports/revenue
type RevenueReport struct {
	TotalRevenue  int                `json:"total_revenue"`
	TotalCOGS     int                `json:"total_cogs"`
	TotalProfit   int                `json:"total_profit"`
	InvoiceCount  int                `json:"invoice_count"`
	TotalDiscount int                `json:"total_discount"`
	Daily         []RevenueDataPoint `json:"daily"`
}

// ProfitDataPoint — lợi nhuận theo ngày
type ProfitDataPoint struct {
	Date    string `json:"date"`
	Revenue int    `json:"revenue"`
	COGS    int    `json:"cogs"`
	Profit  int    `json:"profit"`
}

// parseDateRange — helper parse from/to query params
func parseDateRange(c *gin.Context) (time.Time, time.Time, bool) {
	fromStr := c.DefaultQuery("from", time.Now().Format("2006-01-02"))
	toStr := c.DefaultQuery("to", time.Now().Format("2006-01-02"))

	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "from không hợp lệ (YYYY-MM-DD)"})
		return time.Time{}, time.Time{}, false
	}
	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "to không hợp lệ (YYYY-MM-DD)"})
		return time.Time{}, time.Time{}, false
	}
	// to kết thúc cuối ngày
	to = to.Add(24*time.Hour - time.Nanosecond)
	return from, to, true
}

// GetRevenueReport — GET /api/reports/revenue?from=2026-04-01&to=2026-04-08
func GetRevenueReport(c *gin.Context) {
	from, to, ok := parseDateRange(c)
	if !ok {
		return
	}

	// Tổng doanh thu + số hóa đơn + tổng giảm giá
	var summary struct {
		TotalRevenue  int `gorm:"column:total_revenue"`
		InvoiceCount  int `gorm:"column:invoice_count"`
		TotalDiscount int `gorm:"column:total_discount"`
	}
	config.DB.Model(&models.Invoice{}).
		Select("COALESCE(SUM(final_total), 0) as total_revenue, COUNT(*) as invoice_count, COALESCE(SUM(discount_amount), 0) as total_discount").
		Where("status = ? AND created_at >= ? AND created_at <= ?", "completed", from, to).
		Scan(&summary)

	// Tổng giá vốn (COGS)
	var totalCOGS struct {
		Value int `gorm:"column:value"`
	}
	config.DB.Model(&models.InvoiceItem{}).
		Select("COALESCE(SUM(invoice_items.cost_price * invoice_items.quantity), 0) as value").
		Joins("JOIN invoices ON invoices.id = invoice_items.invoice_id").
		Where("invoices.status = ? AND invoices.created_at >= ? AND invoices.created_at <= ?", "completed", from, to).
		Scan(&totalCOGS)

	// Doanh thu theo ngày
	var daily []RevenueDataPoint
	config.DB.Model(&models.Invoice{}).
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(final_total), 0) as revenue, COUNT(*) as invoice_count").
		Where("status = ? AND created_at >= ? AND created_at <= ?", "completed", from, to).
		Group("TO_CHAR(created_at, 'YYYY-MM-DD')").
		Order("date ASC").
		Scan(&daily)

	c.JSON(http.StatusOK, RevenueReport{
		TotalRevenue:  summary.TotalRevenue,
		TotalCOGS:     totalCOGS.Value,
		TotalProfit:   summary.TotalRevenue - totalCOGS.Value,
		InvoiceCount:  summary.InvoiceCount,
		TotalDiscount: summary.TotalDiscount,
		Daily:         daily,
	})
}

// GetProfitReport — GET /api/reports/profit?from=&to=
func GetProfitReport(c *gin.Context) {
	from, to, ok := parseDateRange(c)
	if !ok {
		return
	}

	var daily []ProfitDataPoint
	config.DB.Raw(`
		SELECT
			TO_CHAR(i.created_at, 'YYYY-MM-DD') as date,
			COALESCE(SUM(i.final_total), 0) as revenue,
			COALESCE(SUM(ii.cost_price * ii.quantity), 0) as cogs,
			COALESCE(SUM(i.final_total), 0) - COALESCE(SUM(ii.cost_price * ii.quantity), 0) as profit
		FROM invoices i
		JOIN invoice_items ii ON ii.invoice_id = i.id
		WHERE i.status = 'completed' AND i.created_at >= ? AND i.created_at <= ?
		GROUP BY TO_CHAR(i.created_at, 'YYYY-MM-DD')
		ORDER BY date ASC
	`, from, to).Scan(&daily)

	c.JSON(http.StatusOK, daily)
}
```

- [ ] **Step 2: Test thủ công bằng curl (sau khi đăng ký route ở Task 3)**

```bash
# Lấy token
TOKEN=$(curl -s http://localhost:8082/api/auth/login -d '{"phone":"0999999999","password":"admin123"}' -H 'Content-Type: application/json' | jq -r '.token')

# Test revenue
curl -s "http://localhost:8082/api/reports/revenue?from=2026-04-01&to=2026-04-08" -H "Authorization: Bearer $TOKEN" | jq

# Test profit
curl -s "http://localhost:8082/api/reports/profit?from=2026-04-01&to=2026-04-08" -H "Authorization: Bearer $TOKEN" | jq
```

- [ ] **Step 3: Commit**

```bash
git add backend/handlers/report.go
git commit -m "feat: add revenue and profit report handlers"
```

---

## Task 2: Backend — Report handlers (top-products + compare)

**Files:**
- Modify: `backend/handlers/report.go`

- [ ] **Step 1: Thêm GetTopProducts handler vào report.go**

```go
// TopProductItem — sản phẩm bán chạy/ế
type TopProductItem struct {
	ProductID   uint   `json:"product_id"`
	ProductName string `json:"product_name"`
	TotalQty    int    `json:"total_qty"`
	Revenue     int    `json:"revenue"`
	Profit      int    `json:"profit"`
}

// GetTopProducts — GET /api/reports/top-products?from=&to=&limit=10&sort=desc
func GetTopProducts(c *gin.Context) {
	from, to, ok := parseDateRange(c)
	if !ok {
		return
	}

	limit := 10
	if l, err := strconv.Atoi(c.DefaultQuery("limit", "10")); err == nil && l > 0 && l <= 50 {
		limit = l
	}

	sortOrder := "DESC"
	if c.DefaultQuery("sort", "desc") == "asc" {
		sortOrder = "ASC"
	}

	var items []TopProductItem
	config.DB.Raw(`
		SELECT
			ii.product_id,
			p.name as product_name,
			SUM(ii.quantity) as total_qty,
			SUM(ii.price * ii.quantity) as revenue,
			SUM((ii.price - ii.cost_price) * ii.quantity) as profit
		FROM invoice_items ii
		JOIN invoices i ON i.id = ii.invoice_id
		JOIN products p ON p.id = ii.product_id
		WHERE i.status = 'completed' AND i.created_at >= ? AND i.created_at <= ?
		GROUP BY ii.product_id, p.name
		ORDER BY total_qty `+sortOrder+`
		LIMIT ?
	`, from, to, limit).Scan(&items)

	c.JSON(http.StatusOK, items)
}
```

- [ ] **Step 2: Thêm GetCompareReport handler vào report.go**

```go
// CompareReport — so sánh 2 khoảng thời gian
type ComparePeriod struct {
	Revenue      int `json:"revenue"`
	COGS         int `json:"cogs"`
	Profit       int `json:"profit"`
	InvoiceCount int `json:"invoice_count"`
}

type CompareReport struct {
	Current  ComparePeriod          `json:"current"`
	Previous ComparePeriod          `json:"previous"`
	Weekly   []CompareWeeklyItem    `json:"weekly"`
}

type CompareWeeklyItem struct {
	Week            int `json:"week"`
	CurrentRevenue  int `json:"current_revenue"`
	PreviousRevenue int `json:"previous_revenue"`
}

// getPeriodSummary — helper tính tổng cho 1 khoảng thời gian
func getPeriodSummary(from, to time.Time) ComparePeriod {
	var result struct {
		Revenue      int `gorm:"column:revenue"`
		InvoiceCount int `gorm:"column:invoice_count"`
	}
	config.DB.Model(&models.Invoice{}).
		Select("COALESCE(SUM(final_total), 0) as revenue, COUNT(*) as invoice_count").
		Where("status = ? AND created_at >= ? AND created_at <= ?", "completed", from, to).
		Scan(&result)

	var cogs struct {
		Value int `gorm:"column:value"`
	}
	config.DB.Model(&models.InvoiceItem{}).
		Select("COALESCE(SUM(invoice_items.cost_price * invoice_items.quantity), 0) as value").
		Joins("JOIN invoices ON invoices.id = invoice_items.invoice_id").
		Where("invoices.status = ? AND invoices.created_at >= ? AND invoices.created_at <= ?", "completed", from, to).
		Scan(&cogs)

	return ComparePeriod{
		Revenue:      result.Revenue,
		COGS:         cogs.Value,
		Profit:       result.Revenue - cogs.Value,
		InvoiceCount: result.InvoiceCount,
	}
}

// GetCompareReport — GET /api/reports/compare
// Tự động so sánh tháng hiện tại vs tháng trước
func GetCompareReport(c *gin.Context) {
	now := time.Now()

	// Tháng hiện tại: ngày 1 → hôm nay
	currentFrom := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	currentTo := now

	// Tháng trước: ngày 1 → cuối tháng
	prevFrom := currentFrom.AddDate(0, -1, 0)
	prevTo := currentFrom.Add(-time.Nanosecond)

	current := getPeriodSummary(currentFrom, currentTo)
	previous := getPeriodSummary(prevFrom, prevTo)

	// Doanh thu theo tuần
	var currentWeekly []CompareWeeklyItem
	config.DB.Raw(`
		SELECT
			EXTRACT(WEEK FROM created_at)::int - EXTRACT(WEEK FROM ?::date)::int + 1 as week,
			COALESCE(SUM(final_total), 0) as current_revenue,
			0 as previous_revenue
		FROM invoices
		WHERE status = 'completed' AND created_at >= ? AND created_at <= ?
		GROUP BY week
		ORDER BY week
	`, currentFrom, currentFrom, currentTo).Scan(&currentWeekly)

	var prevWeekly []struct {
		Week    int `gorm:"column:week"`
		Revenue int `gorm:"column:revenue"`
	}
	config.DB.Raw(`
		SELECT
			EXTRACT(WEEK FROM created_at)::int - EXTRACT(WEEK FROM ?::date)::int + 1 as week,
			COALESCE(SUM(final_total), 0) as revenue
		FROM invoices
		WHERE status = 'completed' AND created_at >= ? AND created_at <= ?
		GROUP BY week
		ORDER BY week
	`, prevFrom, prevFrom, prevTo).Scan(&prevWeekly)

	// Merge weekly data
	weekMap := make(map[int]*CompareWeeklyItem)
	for i := range currentWeekly {
		weekMap[currentWeekly[i].Week] = &currentWeekly[i]
	}
	for _, pw := range prevWeekly {
		if item, ok := weekMap[pw.Week]; ok {
			item.PreviousRevenue = pw.Revenue
		} else {
			currentWeekly = append(currentWeekly, CompareWeeklyItem{
				Week:            pw.Week,
				PreviousRevenue: pw.Revenue,
			})
		}
	}

	c.JSON(http.StatusOK, CompareReport{
		Current:  current,
		Previous: previous,
		Weekly:   currentWeekly,
	})
}
```

- [ ] **Step 3: Thêm import "strconv" vào đầu file report.go nếu chưa có**

Đầu file cần imports:
```go
import (
	"net/http"
	"strconv"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)
```

- [ ] **Step 4: Commit**

```bash
git add backend/handlers/report.go
git commit -m "feat: add top-products and compare report handlers"
```

---

## Task 3: Backend — Register report routes

**Files:**
- Modify: `backend/routes/routes.go:106-119`

- [ ] **Step 1: Thêm report routes vào admin group**

Trong `routes.go`, thêm sau dòng `admin.POST("/alerts/send-email", handlers.SendAlertEmail)` (line 118):

```go
			// === Reports (admin only) ===
			admin.GET("/reports/revenue", handlers.GetRevenueReport)
			admin.GET("/reports/profit", handlers.GetProfitReport)
			admin.GET("/reports/top-products", handlers.GetTopProducts)
			admin.GET("/reports/compare", handlers.GetCompareReport)
```

- [ ] **Step 2: Build kiểm tra không lỗi**

```bash
cd /home/thb/Documents/taphoa-management/backend && go build ./...
```

- [ ] **Step 3: Test bằng curl**

```bash
TOKEN=$(curl -s http://localhost:8082/api/auth/login -d '{"phone":"0999999999","password":"admin123"}' -H 'Content-Type: application/json' | jq -r '.token')

# Revenue
curl -s "http://localhost:8082/api/reports/revenue?from=2026-03-01&to=2026-04-08" -H "Authorization: Bearer $TOKEN" | jq

# Top products
curl -s "http://localhost:8082/api/reports/top-products?from=2026-03-01&to=2026-04-08&limit=5" -H "Authorization: Bearer $TOKEN" | jq

# Compare
curl -s "http://localhost:8082/api/reports/compare" -H "Authorization: Bearer $TOKEN" | jq
```

- [ ] **Step 4: Commit**

```bash
git add backend/routes/routes.go
git commit -m "feat: register report API routes (admin only)"
```

---

## Task 4: Frontend — Install recharts + add types

**Files:**
- Modify: `frontend/package.json` (via npm install)
- Modify: `frontend/src/types/index.ts`

- [ ] **Step 1: Install recharts**

```bash
cd /home/thb/Documents/taphoa-management/frontend && npm install recharts
```

- [ ] **Step 2: Thêm report types vào types/index.ts**

Thêm vào cuối file `frontend/src/types/index.ts`:

```typescript
// === Reports ===

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  invoice_count: number;
}

export interface RevenueReport {
  total_revenue: number;
  total_cogs: number;
  total_profit: number;
  invoice_count: number;
  total_discount: number;
  daily: RevenueDataPoint[];
}

export interface ProfitDataPoint {
  date: string;
  revenue: number;
  cogs: number;
  profit: number;
}

export interface TopProductItem {
  product_id: number;
  product_name: string;
  total_qty: number;
  revenue: number;
  profit: number;
}

export interface ComparePeriod {
  revenue: number;
  cogs: number;
  profit: number;
  invoice_count: number;
}

export interface CompareWeeklyItem {
  week: number;
  current_revenue: number;
  previous_revenue: number;
}

export interface CompareReport {
  current: ComparePeriod;
  previous: ComparePeriod;
  weekly: CompareWeeklyItem[];
}

export interface PriceHistoryItem {
  id: number;
  product_id: number;
  old_price: number;
  new_price: number;
  changed_by: number;
  user?: User;
  created_at: string;
}

export interface DiscountDetail {
  invoice_id: number;
  user_name: string;
  discount_amount: number;
  final_total: number;
  created_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/thb/Documents/taphoa-management && git add frontend/package.json frontend/package-lock.json frontend/src/types/index.ts
git commit -m "feat: install recharts and add report types"
```

---

## Task 5: Frontend — ReportsPage Tab Doanh thu

**Files:**
- Create: `frontend/src/pages/ReportsPage.tsx`

- [ ] **Step 1: Tạo ReportsPage với Tab Doanh thu**

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Card, Tabs, message, Segmented, DatePicker, Row, Col, Statistic, Table, Tag, Button, Space, Typography } from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  FallOutlined,
  PercentageOutlined,
  DownloadOutlined,
  FireOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend,
} from 'recharts';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import api from '../services/api';
import { formatVND } from '../utils/format';
import { PageHeader } from '../components/common';
import type {
  RevenueReport, ProfitDataPoint, TopProductItem, CompareReport, DiscountDetail,
} from '../types';

const { RangePicker } = DatePicker;

type QuickRange = 'today' | 'week' | 'month' | 'custom';

function getDateRange(quick: QuickRange): [Dayjs, Dayjs] {
  const today = dayjs();
  switch (quick) {
    case 'today': return [today, today];
    case 'week': return [today.startOf('week'), today];
    case 'month': return [today.startOf('month'), today];
    default: return [today, today];
  }
}

// Formatter cho tooltip
const vndFormatter = (value: number) => formatVND(value);

// Tab Doanh thu
function RevenueTab() {
  const [quick, setQuick] = useState<QuickRange>('today');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(getDateRange('today'));
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [profit, setProfit] = useState<ProfitDataPoint[]>([]);
  const [discounts, setDiscounts] = useState<DiscountDetail[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = dateRange[0].format('YYYY-MM-DD');
    const to = dateRange[1].format('YYYY-MM-DD');
    try {
      const [revRes, profitRes] = await Promise.allSettled([
        api.get('/reports/revenue', { params: { from, to } }),
        api.get('/reports/profit', { params: { from, to } }),
      ]);
      if (revRes.status === 'fulfilled') setRevenue(revRes.value.data);
      if (profitRes.status === 'fulfilled') setProfit(profitRes.value.data || []);
      const failed = [revRes, profitRes].filter(r => r.status === 'rejected');
      if (failed.length > 0) message.error('Lỗi tải dữ liệu báo cáo');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Format date ngắn cho biểu đồ (01/04 thay vì 2026-04-01)
  const formatChartDate = (dateStr: string) => {
    const d = dayjs(dateStr);
    return d.format('DD/MM');
  };

  return (
    <div>
      {/* Date picker */}
      <Space style={{ marginBottom: 20 }}>
        <Segmented
          value={quick}
          onChange={(v) => {
            const q = v as QuickRange;
            setQuick(q);
            if (q !== 'custom') setDateRange(getDateRange(q));
          }}
          options={[
            { label: 'Hôm nay', value: 'today' },
            { label: 'Tuần này', value: 'week' },
            { label: 'Tháng này', value: 'month' },
            { label: 'Tùy chọn', value: 'custom' },
          ]}
        />
        {quick === 'custom' && (
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
            format="DD/MM/YYYY"
          />
        )}
      </Space>

      {/* Stat cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Doanh thu"
              value={revenue?.total_revenue ?? 0}
              formatter={(v) => formatVND(v as number)}
              valueStyle={{ color: '#0d9488', fontSize: 22 }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Giá vốn"
              value={revenue?.total_cogs ?? 0}
              formatter={(v) => formatVND(v as number)}
              valueStyle={{ color: '#64748b', fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Lợi nhuận"
              value={revenue?.total_profit ?? 0}
              formatter={(v) => formatVND(v as number)}
              valueStyle={{ color: '#22c55e', fontSize: 22 }}
              prefix={<RiseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Số hóa đơn"
              value={revenue?.invoice_count ?? 0}
              valueStyle={{ color: '#0d9488', fontSize: 22 }}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" loading={loading}>
            <Statistic
              title="Tổng giảm giá"
              value={revenue?.total_discount ?? 0}
              formatter={(v) => formatVND(v as number)}
              valueStyle={{ color: '#f59e0b', fontSize: 22 }}
              prefix={<PercentageOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Biểu đồ doanh thu */}
      <Card title="Doanh thu theo ngày" size="small" style={{ marginBottom: 16 }} loading={loading}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenue?.daily || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tickFormatter={formatChartDate} fontSize={12} />
            <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000)}K` : v} fontSize={11} />
            <Tooltip formatter={vndFormatter} labelFormatter={(l) => `Ngày ${formatChartDate(l)}`} />
            <Bar dataKey="revenue" name="Doanh thu" fill="#0d9488" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 10, formatter: (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000)}K` }} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Biểu đồ lợi nhuận */}
      <Card title="Lợi nhuận theo ngày" size="small" loading={loading}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={profit}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tickFormatter={formatChartDate} fontSize={12} />
            <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000)}K` : v} fontSize={11} />
            <Tooltip formatter={vndFormatter} labelFormatter={(l) => `Ngày ${formatChartDate(l)}`} />
            <Area type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#22c55e" fill="rgba(34,197,94,0.08)" strokeWidth={2.5} dot={{ r: 4, fill: '#fff', stroke: '#22c55e', strokeWidth: 2 }} label={{ position: 'top', fontSize: 10, formatter: (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000)}K` }} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div>
      <PageHeader title="Báo cáo" />
      <Tabs
        defaultActiveKey="revenue"
        items={[
          {
            key: 'revenue',
            label: <span><DollarOutlined /> Doanh thu</span>,
            children: <RevenueTab />,
          },
          {
            key: 'compare',
            label: <span><RiseOutlined /> So sánh</span>,
            children: <div>So sánh (sẽ thêm ở Task 6)</div>,
          },
          {
            key: 'top-products',
            label: <span><FireOutlined /> Top sản phẩm</span>,
            children: <div>Top SP (sẽ thêm ở Task 7)</div>,
          },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ReportsPage.tsx
git commit -m "feat: add ReportsPage with revenue tab (charts + stat cards)"
```

---

## Task 6: Frontend — ReportsPage Tab So sánh

**Files:**
- Modify: `frontend/src/pages/ReportsPage.tsx`

- [ ] **Step 1: Thêm CompareTab component vào ReportsPage.tsx**

Thêm trước `export default function ReportsPage()`:

```tsx
// Tab So sánh
function CompareTab() {
  const [data, setData] = useState<CompareReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get('/reports/compare')
      .then(res => setData(res.data))
      .catch(() => message.error('Lỗi tải dữ liệu so sánh'))
      .finally(() => setLoading(false));
  }, []);

  const calcChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous * 100);
  };

  const changeTag = (current: number, previous: number) => {
    const pct = calcChange(current, previous);
    const isUp = pct >= 0;
    return (
      <span style={{ color: isUp ? '#22c55e' : '#ef4444', fontWeight: 600, fontSize: 13 }}>
        {isUp ? '+' : ''}{pct.toFixed(1)}%{isUp ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div>
      {/* Summary cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card size="small" loading={loading}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Doanh thu</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {formatVND(data?.previous.revenue ?? 0)}
                </Typography.Text>
                <span style={{ margin: '0 4px', color: '#94a3b8' }}>→</span>
                <Typography.Text strong style={{ fontSize: 18, color: '#0d9488' }}>
                  {formatVND(data?.current.revenue ?? 0)}
                </Typography.Text>
              </div>
              {data && changeTag(data.current.revenue, data.previous.revenue)}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" loading={loading}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Lợi nhuận</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {formatVND(data?.previous.profit ?? 0)}
                </Typography.Text>
                <span style={{ margin: '0 4px', color: '#94a3b8' }}>→</span>
                <Typography.Text strong style={{ fontSize: 18, color: '#22c55e' }}>
                  {formatVND(data?.current.profit ?? 0)}
                </Typography.Text>
              </div>
              {data && changeTag(data.current.profit, data.previous.profit)}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" loading={loading}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Số hóa đơn</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {data?.previous.invoice_count ?? 0}
                </Typography.Text>
                <span style={{ margin: '0 4px', color: '#94a3b8' }}>→</span>
                <Typography.Text strong style={{ fontSize: 18, color: '#0d9488' }}>
                  {data?.current.invoice_count ?? 0}
                </Typography.Text>
              </div>
              {data && changeTag(data.current.invoice_count, data.previous.invoice_count)}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Grouped bar chart */}
      <Card title="Doanh thu theo tuần" size="small" loading={loading}>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data?.weekly || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="week" tickFormatter={(w) => `Tuần ${w}`} fontSize={12} />
            <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000)}K` : v} fontSize={11} />
            <Tooltip formatter={vndFormatter} labelFormatter={(w) => `Tuần ${w}`} />
            <Legend />
            <Bar dataKey="previous_revenue" name="Tháng trước" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="current_revenue" name="Tháng này" fill="#0d9488" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Thay placeholder trong Tabs items**

Trong `ReportsPage`, thay `children: <div>So sánh (sẽ thêm ở Task 6)</div>` bằng:

```tsx
children: <CompareTab />,
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ReportsPage.tsx
git commit -m "feat: add compare tab to ReportsPage"
```

---

## Task 7: Frontend — ReportsPage Tab Top sản phẩm

**Files:**
- Modify: `frontend/src/pages/ReportsPage.tsx`

- [ ] **Step 1: Thêm TopProductsTab component**

Thêm trước `export default function ReportsPage()`:

```tsx
// Tab Top sản phẩm
function TopProductsTab() {
  const [sortMode, setSortMode] = useState<'desc' | 'asc'>('desc');
  const [quick, setQuick] = useState<QuickRange>('month');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(getDateRange('month'));
  const [data, setData] = useState<TopProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = dateRange[0].format('YYYY-MM-DD');
    const to = dateRange[1].format('YYYY-MM-DD');
    try {
      const res = await api.get('/reports/top-products', { params: { from, to, limit: 10, sort: sortMode } });
      setData(res.data || []);
    } catch {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [dateRange, sortMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    {
      title: '#',
      width: 50,
      render: (_: any, __: any, index: number) => {
        const colors = ['#f59e0b', '#94a3b8', '#cd7f32'];
        return <span style={{ fontWeight: 700, color: colors[index] || '#64748b' }}>{index + 1}</span>;
      },
    },
    { title: 'Sản phẩm', dataIndex: 'product_name', ellipsis: true },
    { title: 'SL bán', dataIndex: 'total_qty', width: 100, align: 'right' as const, render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: 'Doanh thu', dataIndex: 'revenue', width: 140, align: 'right' as const, render: (v: number) => formatVND(v) },
    { title: 'Lợi nhuận', dataIndex: 'profit', width: 140, align: 'right' as const, render: (v: number) => <span style={{ color: '#22c55e', fontWeight: 600 }}>{formatVND(v)}</span> },
  ];

  return (
    <div>
      {/* Toggle + date picker */}
      <Space style={{ marginBottom: 16 }}>
        <Segmented
          value={sortMode}
          onChange={(v) => setSortMode(v as 'desc' | 'asc')}
          options={[
            { label: 'Bán chạy', value: 'desc' },
            { label: 'Bán ế', value: 'asc' },
          ]}
        />
        <Segmented
          value={quick}
          onChange={(v) => {
            const q = v as QuickRange;
            setQuick(q);
            if (q !== 'custom') setDateRange(getDateRange(q));
          }}
          options={[
            { label: 'Tuần này', value: 'week' },
            { label: 'Tháng này', value: 'month' },
            { label: 'Tùy chọn', value: 'custom' },
          ]}
        />
        {quick === 'custom' && (
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) setDateRange([dates[0], dates[1]]);
            }}
            format="DD/MM/YYYY"
          />
        )}
      </Space>

      <Table
        dataSource={data}
        columns={columns}
        rowKey="product_id"
        loading={loading}
        pagination={false}
        size="middle"
      />
    </div>
  );
}
```

- [ ] **Step 2: Thay placeholder trong Tabs items**

Thay `children: <div>Top SP (sẽ thêm ở Task 7)</div>` bằng:

```tsx
children: <TopProductsTab />,
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/ReportsPage.tsx
git commit -m "feat: add top products tab to ReportsPage"
```

---

## Task 8: Frontend — Route + Menu báo cáo (admin only)

**Files:**
- Modify: `frontend/src/App.tsx:8-9,116-117`
- Modify: `frontend/src/components/AppLayout.tsx:3,28-73`

- [ ] **Step 1: Thêm import + route trong App.tsx**

Thêm import (sau dòng `import AlertsPage`):
```tsx
import ReportsPage from './pages/ReportsPage';
```

Thêm route (sau `<Route path="/waste" element={<WastePage />} />`):
```tsx
              <Route path="/reports" element={<ReportsPage />} />
```

- [ ] **Step 2: Thêm menu Báo cáo (admin only) trong AppLayout.tsx**

Thêm import `BarChartOutlined`:
```tsx
import {
  ShoppingCartOutlined,
  AppstoreOutlined,
  InboxOutlined,
  ShopOutlined,
  TeamOutlined,
  FileTextOutlined,
  SwapOutlined,
  DeleteOutlined,
  AuditOutlined,
  DollarOutlined,
  LogoutOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
```

Thay `const menuItems` thành function nhận `role`:

```tsx
function getMenuItems(role?: string): MenuProps['items'] {
  const items: MenuProps['items'] = [
    { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/alerts', icon: <AlertOutlined />, label: 'Cảnh báo' },
    {
      key: 'sales',
      label: 'Đơn hàng',
      icon: <FileTextOutlined />,
      children: [
        { key: '/invoices', icon: <FileTextOutlined />, label: 'Lịch sử đơn' },
        { key: '/shifts', icon: <ClockCircleOutlined />, label: 'Ca bán hàng' },
        { key: '/returns', icon: <SwapOutlined />, label: 'Trả hàng' },
      ],
    },
    {
      key: 'products',
      label: 'Hàng hóa',
      icon: <AppstoreOutlined />,
      children: [
        { key: '/products', icon: <AppstoreOutlined />, label: 'Sản phẩm' },
        { key: '/categories', icon: <AppstoreOutlined />, label: 'Nhóm hàng' },
      ],
    },
    {
      key: 'inventory',
      label: 'Kho',
      icon: <InboxOutlined />,
      children: [
        { key: '/inventory', icon: <InboxOutlined />, label: 'Tồn kho' },
        { key: '/purchase-orders', icon: <ShopOutlined />, label: 'Nhập hàng' },
        { key: '/suppliers', icon: <ShopOutlined />, label: 'Nhà cung cấp' },
        { key: '/inventory-checks', icon: <AuditOutlined />, label: 'Kiểm kê' },
        { key: '/waste', icon: <DeleteOutlined />, label: 'Xuất hủy' },
      ],
    },
    {
      key: 'customers',
      label: 'Khách hàng',
      icon: <TeamOutlined />,
      children: [
        { key: '/customers', icon: <TeamOutlined />, label: 'Danh sách' },
        { key: '/debts', icon: <DollarOutlined />, label: 'Công nợ' },
      ],
    },
  ];

  // Báo cáo: chỉ admin thấy
  if (role === 'admin') {
    items.push({ key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo' });
  }

  items.push({ type: 'divider' as const });
  items.push({ key: '/pos', icon: <ShoppingCartOutlined />, label: 'Bán hàng' });

  return items;
}
```

Trong component `AppLayout`, thay `items={menuItems}` bằng:
```tsx
items={getMenuItems(user?.role)}
```

Và cập nhật `getOpenKey` để nhận items từ function:
```tsx
const items = getMenuItems(user?.role);
```
rồi dùng `items` thay cho `menuItems` trong `getOpenKey` và `defaultOpenKeys`.

- [ ] **Step 3: Verify — chạy frontend, login admin → thấy menu "Báo cáo", login staff → không thấy**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/AppLayout.tsx
git commit -m "feat: add reports route and admin-only menu item"
```

---

## Task 9: POS — Giới hạn giảm giá 20% cho staff

**Files:**
- Modify: `frontend/src/pages/POSPage.tsx:571-583`
- Modify: `backend/handlers/invoice.go:131-136`

- [ ] **Step 1: Backend — validate discount limit cho staff**

Trong `backend/handlers/invoice.go`, sau dòng `finalTotal := total - req.DiscountAmount` (line 131), thêm validate:

```go
	finalTotal := total - req.DiscountAmount
	if finalTotal < 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Giảm giá vượt quá tổng tiền"})
		return
	}

	// Giới hạn giảm giá 20% cho staff
	role, _ := c.Get("role")
	if role != "admin" && total > 0 {
		maxDiscount := total * 20 / 100
		if req.DiscountAmount > maxDiscount {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Nhân viên chỉ được giảm tối đa 20%% (%s)", formatVNDBackend(maxDiscount)),
			})
			return
		}
	}
```

Thêm helper `formatVNDBackend` vào `backend/handlers/helpers.go`:

```go
// formatVNDBackend — format tiền VND cho backend messages
func formatVNDBackend(amount int) string {
	s := strconv.Itoa(amount)
	// Thêm dấu chấm phân cách hàng nghìn
	result := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += "."
		}
		result += string(c)
	}
	return result + "đ"
}
```

- [ ] **Step 2: Frontend — clamp discount cho staff + hiện warning**

Trong `frontend/src/pages/POSPage.tsx`, sửa phần discount InputNumber onChange. Tìm đoạn:

```tsx
onChange={(v) => {
  if (discountMode === 'percent') {
    const pct = v || 0;
    setDiscountPercent(pct);
    setDiscountAmount(Math.round(subtotal * pct / 100));
  } else {
    setDiscountAmount(v || 0);
    setDiscountPercent(subtotal > 0 ? Math.round((v || 0) / subtotal * 100) : 0);
  }
}}
```

Thay bằng:

```tsx
onChange={(v) => {
  const maxPct = user?.role === 'admin' ? 100 : 20;
  if (discountMode === 'percent') {
    const pct = Math.min(v || 0, maxPct);
    setDiscountPercent(pct);
    setDiscountAmount(Math.round(subtotal * pct / 100));
    if ((v || 0) > maxPct) message.warning(`Chỉ được giảm tối đa ${maxPct}%`);
  } else {
    const maxAmount = Math.round(subtotal * maxPct / 100);
    const amount = Math.min(v || 0, user?.role === 'admin' ? subtotal : maxAmount);
    setDiscountAmount(amount);
    setDiscountPercent(subtotal > 0 ? Math.round(amount / subtotal * 100) : 0);
    if ((v || 0) > maxAmount && user?.role !== 'admin') message.warning(`Chỉ được giảm tối đa ${maxPct}% (${formatVND(maxAmount)})`);
  }
}}
```

Và sửa `max` prop:

```tsx
max={discountMode === 'percent' ? (user?.role === 'admin' ? 100 : 20) : (user?.role === 'admin' ? subtotal : Math.round(subtotal * 20 / 100))}
```

- [ ] **Step 3: Test — login staff, thử giảm giá > 20% → bị chặn**

- [ ] **Step 4: Commit**

```bash
git add backend/handlers/invoice.go backend/handlers/helpers.go frontend/src/pages/POSPage.tsx
git commit -m "feat: limit staff discount to 20% on POS"
```

---

## Task 10: Backend — Price history API

**Files:**
- Create: `backend/handlers/price_history.go`
- Modify: `backend/routes/routes.go`

- [ ] **Step 1: Tạo handler lấy lịch sử giá**

```go
package handlers

import (
	"net/http"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

// GetPriceHistory — GET /api/products/:id/price-history
func GetPriceHistory(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	// Kiểm tra product tồn tại
	var product models.Product
	if err := config.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sản phẩm không tồn tại"})
		return
	}

	var history []models.PriceHistory
	config.DB.
		Preload("User").
		Where("product_id = ?", id).
		Order("created_at DESC").
		Find(&history)

	c.JSON(http.StatusOK, history)
}
```

- [ ] **Step 2: Đăng ký route**

Trong `routes.go`, thêm vào group `auth` (sau dòng `auth.GET("/products/:id/batches", handlers.ListProductBatches)`):

```go
			auth.GET("/products/:id/price-history", handlers.GetPriceHistory)
```

- [ ] **Step 3: Build + test**

```bash
cd /home/thb/Documents/taphoa-management/backend && go build ./...
```

- [ ] **Step 4: Commit**

```bash
git add backend/handlers/price_history.go backend/routes/routes.go
git commit -m "feat: add price history API endpoint"
```

---

## Task 11: Frontend — Price history modal trong ProductsPage

**Files:**
- Modify: `frontend/src/pages/ProductsPage.tsx`

- [ ] **Step 1: Thêm state + fetch cho price history**

Thêm import:
```tsx
import { HistoryOutlined } from '@ant-design/icons';
import type { PriceHistoryItem } from '../types';
```

Thêm state (cạnh các state khác):
```tsx
const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);
const [priceHistoryProduct, setPriceHistoryProduct] = useState<string>('');
```

Thêm function fetch:
```tsx
const fetchPriceHistory = async (productId: number, productName: string) => {
  setPriceHistoryProduct(productName);
  setPriceHistoryOpen(true);
  setPriceHistoryLoading(true);
  try {
    const res = await api.get(`/products/${productId}/price-history`);
    setPriceHistory(res.data || []);
  } catch {
    message.error('Lỗi tải lịch sử giá');
  } finally {
    setPriceHistoryLoading(false);
  }
};
```

- [ ] **Step 2: Thêm icon lịch sử bên cạnh cột giá bán**

Tìm column "Giá bán" trong `columns`, sửa render:

```tsx
{
  title: 'Giá bán',
  dataIndex: 'sell_price',
  width: 150,
  render: (v: number, record: ProductWithStock) => (
    <Space>
      <span>{formatVND(v)}</span>
      <Button
        type="text"
        size="small"
        icon={<HistoryOutlined />}
        onClick={(e) => {
          e.stopPropagation();
          fetchPriceHistory(record.id, record.name);
        }}
        style={{ color: '#94a3b8' }}
      />
    </Space>
  ),
  align: 'right' as const,
},
```

- [ ] **Step 3: Thêm Modal hiện lịch sử giá**

Thêm trước closing `</div>` cuối component:

```tsx
<Modal
  title={`Lịch sử giá — ${priceHistoryProduct}`}
  open={priceHistoryOpen}
  onCancel={() => setPriceHistoryOpen(false)}
  footer={null}
  width={600}
>
  <Table
    dataSource={priceHistory}
    rowKey="id"
    loading={priceHistoryLoading}
    pagination={false}
    size="small"
    locale={{ emptyText: 'Chưa có lịch sử thay đổi giá' }}
    columns={[
      {
        title: 'Thời gian',
        dataIndex: 'created_at',
        width: 160,
        render: (v: string) => new Date(v).toLocaleString('vi-VN'),
      },
      {
        title: 'Giá cũ',
        dataIndex: 'old_price',
        width: 120,
        align: 'right' as const,
        render: (v: number) => <span style={{ color: '#ef4444' }}>{formatVND(v)}</span>,
      },
      {
        title: 'Giá mới',
        dataIndex: 'new_price',
        width: 120,
        align: 'right' as const,
        render: (v: number) => <span style={{ color: '#22c55e' }}>{formatVND(v)}</span>,
      },
      {
        title: 'Người sửa',
        dataIndex: ['user', 'name'],
        width: 120,
      },
    ]}
  />
</Modal>
```

- [ ] **Step 4: Test — sửa giá 1 sản phẩm, bấm icon lịch sử → hiện bảng**

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ProductsPage.tsx
git commit -m "feat: add price history modal to ProductsPage"
```

---

## Task 12: Backend — Excel export

**Files:**
- Modify: `backend/handlers/report.go`
- Modify: `backend/routes/routes.go`
- Modify: `backend/go.mod` (via go get)

- [ ] **Step 1: Install excelize**

```bash
cd /home/thb/Documents/taphoa-management/backend && go get github.com/xuri/excelize/v2
```

- [ ] **Step 2: Thêm export handlers vào report.go**

Thêm import `"github.com/xuri/excelize/v2"` và `"fmt"` vào report.go.

Thêm cuối file:

```go
// ExportRevenueExcel — GET /api/reports/revenue/export?from=&to=
func ExportRevenueExcel(c *gin.Context) {
	from, to, ok := parseDateRange(c)
	if !ok {
		return
	}

	// Lấy data
	var daily []RevenueDataPoint
	config.DB.Model(&models.Invoice{}).
		Select("TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(final_total), 0) as revenue, COUNT(*) as invoice_count").
		Where("status = ? AND created_at >= ? AND created_at <= ?", "completed", from, to).
		Group("TO_CHAR(created_at, 'YYYY-MM-DD')").
		Order("date ASC").
		Scan(&daily)

	f := excelize.NewFile()
	sheet := "Doanh thu"
	f.SetSheetName("Sheet1", sheet)

	// Header
	headers := []string{"Ngày", "Doanh thu (đ)", "Số hóa đơn"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	// Data
	for i, d := range daily {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), d.Date)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), d.Revenue)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), d.InvoiceCount)
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=doanh-thu-%s-%s.xlsx", from.Format("20060102"), to.Format("20060102")))
	f.Write(c.Writer)
}

// ExportTopProductsExcel — GET /api/reports/top-products/export?from=&to=&sort=desc
func ExportTopProductsExcel(c *gin.Context) {
	from, to, ok := parseDateRange(c)
	if !ok {
		return
	}

	limit := 50
	sortOrder := "DESC"
	if c.DefaultQuery("sort", "desc") == "asc" {
		sortOrder = "ASC"
	}

	var items []TopProductItem
	config.DB.Raw(`
		SELECT
			ii.product_id,
			p.name as product_name,
			SUM(ii.quantity) as total_qty,
			SUM(ii.price * ii.quantity) as revenue,
			SUM((ii.price - ii.cost_price) * ii.quantity) as profit
		FROM invoice_items ii
		JOIN invoices i ON i.id = ii.invoice_id
		JOIN products p ON p.id = ii.product_id
		WHERE i.status = 'completed' AND i.created_at >= ? AND i.created_at <= ?
		GROUP BY ii.product_id, p.name
		ORDER BY total_qty `+sortOrder+`
		LIMIT ?
	`, from, to, limit).Scan(&items)

	f := excelize.NewFile()
	sheet := "Top san pham"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"#", "Sản phẩm", "SL bán", "Doanh thu (đ)", "Lợi nhuận (đ)"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	for i, item := range items {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), item.ProductName)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), item.TotalQty)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), item.Revenue)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), item.Profit)
	}

	sortLabel := "ban-chay"
	if sortOrder == "ASC" {
		sortLabel = "ban-e"
	}
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=top-sp-%s-%s-%s.xlsx", sortLabel, from.Format("20060102"), to.Format("20060102")))
	f.Write(c.Writer)
}

// ExportCompareExcel — GET /api/reports/compare/export
func ExportCompareExcel(c *gin.Context) {
	now := time.Now()
	currentFrom := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	currentTo := now
	prevFrom := currentFrom.AddDate(0, -1, 0)
	prevTo := currentFrom.Add(-time.Nanosecond)

	current := getPeriodSummary(currentFrom, currentTo)
	previous := getPeriodSummary(prevFrom, prevTo)

	f := excelize.NewFile()
	sheet := "So sanh"
	f.SetSheetName("Sheet1", sheet)

	headers := []string{"Chỉ số", "Tháng trước", "Tháng này", "Chênh lệch"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	rows := []struct {
		Name     string
		Previous int
		Current  int
	}{
		{"Doanh thu", previous.Revenue, current.Revenue},
		{"Lợi nhuận", previous.Profit, current.Profit},
		{"Số hóa đơn", previous.InvoiceCount, current.InvoiceCount},
	}

	for i, r := range rows {
		row := i + 2
		diff := ""
		if r.Previous > 0 {
			pct := float64(r.Current-r.Previous) / float64(r.Previous) * 100
			diff = fmt.Sprintf("%.1f%%", pct)
		}
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), r.Name)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), r.Previous)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), r.Current)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), diff)
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=so-sanh-%s.xlsx", now.Format("200601")))
	f.Write(c.Writer)
}
```

- [ ] **Step 3: Đăng ký export routes**

Trong `routes.go`, thêm vào admin group:

```go
			// === Report exports ===
			admin.GET("/reports/revenue/export", handlers.ExportRevenueExcel)
			admin.GET("/reports/top-products/export", handlers.ExportTopProductsExcel)
			admin.GET("/reports/compare/export", handlers.ExportCompareExcel)
```

- [ ] **Step 4: Build + test**

```bash
cd /home/thb/Documents/taphoa-management/backend && go build ./...
```

- [ ] **Step 5: Commit**

```bash
git add backend/handlers/report.go backend/routes/routes.go backend/go.mod backend/go.sum
git commit -m "feat: add Excel export endpoints for reports"
```

---

## Task 13: Frontend — Nút xuất Excel

**Files:**
- Modify: `frontend/src/pages/ReportsPage.tsx`

- [ ] **Step 1: Thêm helper download Excel**

Thêm vào đầu file ReportsPage.tsx (sau imports):

```tsx
// Helper: download file từ API
function downloadExcel(url: string) {
  const token = localStorage.getItem('token');
  const link = document.createElement('a');
  // Dùng fetch để gửi kèm token
  fetch((process.env.REACT_APP_API_URL || '/api') + url, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      // Lấy filename từ content-disposition hoặc dùng default
      link.download = 'report.xlsx';
      link.click();
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => message.error('Lỗi xuất Excel'));
}
```

- [ ] **Step 2: Thêm nút Export vào RevenueTab**

Trong RevenueTab, thêm nút sau date picker Space:

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
  <Space>
    <Segmented ... />
    {quick === 'custom' && <RangePicker ... />}
  </Space>
  <Button
    icon={<DownloadOutlined />}
    onClick={() => downloadExcel(`/reports/revenue/export?from=${dateRange[0].format('YYYY-MM-DD')}&to=${dateRange[1].format('YYYY-MM-DD')}`)}
  >
    Xuất Excel
  </Button>
</div>
```

- [ ] **Step 3: Thêm nút Export vào CompareTab**

Thêm nút sau summary cards:

```tsx
<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
  <Button icon={<DownloadOutlined />} onClick={() => downloadExcel('/reports/compare/export')}>
    Xuất Excel
  </Button>
</div>
```

- [ ] **Step 4: Thêm nút Export vào TopProductsTab**

Thêm nút cạnh Segmented controls:

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
  <Space>
    <Segmented ... sortMode />
    <Segmented ... quick />
    {quick === 'custom' && <RangePicker ... />}
  </Space>
  <Button
    icon={<DownloadOutlined />}
    onClick={() => downloadExcel(`/reports/top-products/export?from=${dateRange[0].format('YYYY-MM-DD')}&to=${dateRange[1].format('YYYY-MM-DD')}&sort=${sortMode}`)}
  >
    Xuất Excel
  </Button>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ReportsPage.tsx
git commit -m "feat: add Excel export buttons to all report tabs"
```

---

## Thứ tự thực hiện

```
Task 1  → Task 2  → Task 3   (Backend reports — phải theo thứ tự)
Task 4                         (Frontend types + recharts — independent)
Task 5  → Task 6  → Task 7   (Frontend tabs — theo thứ tự, cần Task 3+4 xong)
Task 8                         (Route + menu — cần Task 5 xong)
Task 9                         (POS discount — independent)
Task 10                        (Price history API — independent)
Task 11                        (Price history modal — cần Task 10)
Task 12                        (Excel export backend — cần Task 1+2)
Task 13                        (Excel export frontend — cần Task 5+12)
```

Có thể chạy song song:
- **Wave 1:** Task 1 → 2 → 3 (backend) + Task 4 (frontend types) + Task 9 (POS) + Task 10 (price history API)
- **Wave 2:** Task 5 → 6 → 7 → 8 (frontend reports) + Task 11 (price history modal)
- **Wave 3:** Task 12 → 13 (Excel export)
