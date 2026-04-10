package handlers

import (
	"bytes"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"time"

	"taphoa-management/backend/config"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
)

const invoiceStatusCompleted = "completed"

// --- Response structs ---

type RevenueDataPoint struct {
	Date         string  `json:"date"`
	Revenue      float64 `json:"revenue"`
	InvoiceCount int     `json:"invoice_count"`
}

type RevenueReport struct {
	TotalRevenue  float64            `json:"total_revenue"`
	TotalCOGS     float64            `json:"total_cogs"`
	TotalProfit   float64            `json:"total_profit"`
	InvoiceCount  int                `json:"invoice_count"`
	TotalDiscount float64            `json:"total_discount"`
	Daily         []RevenueDataPoint `json:"daily"`
}

type ProfitDataPoint struct {
	Date    string  `json:"date"`
	Revenue float64 `json:"revenue"`
	COGS    float64 `json:"cogs"`
	Profit  float64 `json:"profit"`
}

type TopProductItem struct {
	ProductID   uint    `json:"product_id"`
	ProductName string  `json:"product_name"`
	TotalQty    int     `json:"total_qty"`
	Revenue     float64 `json:"revenue"`
	Profit      float64 `json:"profit"`
}

type ComparePeriod struct {
	Revenue      float64 `json:"revenue"`
	COGS         float64 `json:"cogs"`
	Profit       float64 `json:"profit"`
	InvoiceCount int     `json:"invoice_count"`
}

type CompareWeeklyItem struct {
	Week            int     `json:"week"`
	CurrentRevenue  float64 `json:"current_revenue"`
	PreviousRevenue float64 `json:"previous_revenue"`
}

type CompareReport struct {
	Current  ComparePeriod       `json:"current"`
	Previous ComparePeriod       `json:"previous"`
	Weekly   []CompareWeeklyItem `json:"weekly"`
}

// --- Shared query helpers ---

// parseDateRange parses `from` and `to` query params (YYYY-MM-DD).
// Defaults to today for both. `to` is extended to end of day (23:59:59).
func parseDateRange(c *gin.Context) (time.Time, time.Time, error) {
	now := time.Now()
	todayStr := now.Format("2006-01-02")

	fromStr := c.DefaultQuery("from", todayStr)
	toStr := c.DefaultQuery("to", todayStr)

	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	toDay, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}

	if from.After(toDay) {
		return time.Time{}, time.Time{}, fmt.Errorf("'from' must not be after 'to'")
	}

	// Include the full end day up to 23:59:59
	to := toDay.Add(24*time.Hour - time.Second)

	return from, to, nil
}

// queryDailyRevenue returns daily revenue breakdown for a date range.
func queryDailyRevenue(from, to time.Time) ([]RevenueDataPoint, error) {
	var rows []RevenueDataPoint

	err := config.DB.Raw(`
		SELECT
			TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
			COALESCE(SUM(final_total), 0)     AS revenue,
			COUNT(*)                           AS invoice_count
		FROM invoices
		WHERE status = ?
		  AND created_at >= ?
		  AND created_at <= ?
		GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
		ORDER BY date
	`, invoiceStatusCompleted, from, to).Scan(&rows).Error

	return rows, err
}

// queryTopProducts returns top/bottom products by quantity sold.
func queryTopProducts(from, to time.Time, sortOrder string, limit int) ([]TopProductItem, error) {
	var rows []TopProductItem

	query := `
		SELECT
			p.id                                           AS product_id,
			p.name                                         AS product_name,
			COALESCE(SUM(ii.quantity), 0)                  AS total_qty,
			COALESCE(SUM(ii.price * ii.quantity), 0)       AS revenue,
			COALESCE(SUM((ii.price - ii.cost_price) * ii.quantity), 0) AS profit
		FROM invoice_items ii
		JOIN invoices i   ON i.id   = ii.invoice_id
		JOIN products p   ON p.id   = ii.product_id
		WHERE i.status = ?
		  AND i.created_at >= ?
		  AND i.created_at <= ?
		GROUP BY p.id, p.name
		ORDER BY total_qty ` + sortOrder + `
		LIMIT ?
	`

	err := config.DB.Raw(query, invoiceStatusCompleted, from, to, limit).Scan(&rows).Error
	return rows, err
}

// getPeriodSummary returns revenue/cogs/profit/invoice_count for a time range.
func getPeriodSummary(from, to time.Time) (ComparePeriod, error) {
	var revenueResult struct {
		Revenue      float64
		InvoiceCount int
	}

	err := config.DB.Raw(`
		SELECT COALESCE(SUM(final_total), 0) AS revenue, COUNT(*) AS invoice_count
		FROM invoices
		WHERE status = ?
		  AND created_at >= ?
		  AND created_at <= ?
	`, invoiceStatusCompleted, from, to).Scan(&revenueResult).Error
	if err != nil {
		return ComparePeriod{}, err
	}

	var cogsResult struct {
		COGS float64
	}

	err = config.DB.Raw(`
		SELECT COALESCE(SUM(ii.cost_price * ii.quantity), 0) AS cogs
		FROM invoice_items ii
		JOIN invoices i ON i.id = ii.invoice_id
		WHERE i.status = ?
		  AND i.created_at >= ?
		  AND i.created_at <= ?
	`, invoiceStatusCompleted, from, to).Scan(&cogsResult).Error
	if err != nil {
		return ComparePeriod{}, err
	}

	return ComparePeriod{
		Revenue:      revenueResult.Revenue,
		COGS:         cogsResult.COGS,
		Profit:       revenueResult.Revenue - cogsResult.COGS,
		InvoiceCount: revenueResult.InvoiceCount,
	}, nil
}

type weeklyRow struct {
	Week    int
	Revenue float64
}

// queryWeeklyRevenue returns weekly revenue breakdown for a date range.
func queryWeeklyRevenue(from, to time.Time) ([]weeklyRow, error) {
	var rows []weeklyRow

	err := config.DB.Raw(`
		SELECT
			(EXTRACT(DAY FROM created_at)::int - 1) / 7 + 1 AS week,
			COALESCE(SUM(final_total), 0)                    AS revenue
		FROM invoices
		WHERE status = ?
		  AND created_at >= ?
		  AND created_at <= ?
		GROUP BY (EXTRACT(DAY FROM created_at)::int - 1) / 7 + 1
		ORDER BY week
	`, invoiceStatusCompleted, from, to).Scan(&rows).Error

	return rows, err
}

// compareMonthRanges returns current and previous month date ranges.
func compareMonthRanges() (currentFrom, currentTo, previousFrom, previousTo time.Time) {
	now := time.Now()
	currentFrom = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	currentTo = time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())
	previousFrom = currentFrom.AddDate(0, -1, 0)
	previousTo = currentFrom.Add(-time.Second)
	return
}

// sendExcel writes an excelize file to the HTTP response as a download.
func sendExcel(c *gin.Context, f *excelize.File, filename string) {
	buf := new(bytes.Buffer)
	if err := f.Write(buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi tạo file Excel"})
		return
	}
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buf.Bytes())
}

// --- Handlers ---

// GetRevenueReport — GET /api/reports/revenue?from=YYYY-MM-DD&to=YYYY-MM-DD
func GetRevenueReport(c *gin.Context) {
	from, to, err := parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	// Aggregate totals from invoices
	var summary struct {
		TotalRevenue  float64
		InvoiceCount  int
		TotalDiscount float64
	}

	err = config.DB.Raw(`
		SELECT
			COALESCE(SUM(final_total), 0)     AS total_revenue,
			COUNT(*)                           AS invoice_count,
			COALESCE(SUM(discount_amount), 0) AS total_discount
		FROM invoices
		WHERE status = ?
		  AND created_at >= ?
		  AND created_at <= ?
	`, invoiceStatusCompleted, from, to).Scan(&summary).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query revenue summary"})
		return
	}

	// Aggregate COGS from invoice_items joined to invoices
	var cogsResult struct {
		TotalCOGS float64
	}

	err = config.DB.Raw(`
		SELECT
			COALESCE(SUM(ii.cost_price * ii.quantity), 0) AS total_cogs
		FROM invoice_items ii
		JOIN invoices i ON i.id = ii.invoice_id
		WHERE i.status = ?
		  AND i.created_at >= ?
		  AND i.created_at <= ?
	`, invoiceStatusCompleted, from, to).Scan(&cogsResult).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query COGS"})
		return
	}

	// Daily breakdown
	daily, err := queryDailyRevenue(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query daily revenue"})
		return
	}

	c.JSON(http.StatusOK, RevenueReport{
		TotalRevenue:  summary.TotalRevenue,
		TotalCOGS:     cogsResult.TotalCOGS,
		TotalProfit:   summary.TotalRevenue - cogsResult.TotalCOGS,
		InvoiceCount:  summary.InvoiceCount,
		TotalDiscount: summary.TotalDiscount,
		Daily:         daily,
	})
}

// GetProfitReport — GET /api/reports/profit?from=YYYY-MM-DD&to=YYYY-MM-DD
func GetProfitReport(c *gin.Context) {
	from, to, err := parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	var rows []ProfitDataPoint

	err = config.DB.Raw(`
		SELECT
			TO_CHAR(i.created_at, 'YYYY-MM-DD') AS date,
			COALESCE(SUM(i.final_total), 0) AS revenue,
			COALESCE(SUM(item_cogs.cogs), 0) AS cogs,
			COALESCE(SUM(i.final_total), 0) - COALESCE(SUM(item_cogs.cogs), 0) AS profit
		FROM invoices i
		LEFT JOIN (
			SELECT invoice_id, SUM(cost_price * quantity) AS cogs
			FROM invoice_items
			GROUP BY invoice_id
		) item_cogs ON item_cogs.invoice_id = i.id
		WHERE i.status = ?
		  AND i.created_at >= ?
		  AND i.created_at <= ?
		GROUP BY TO_CHAR(i.created_at, 'YYYY-MM-DD')
		ORDER BY date
	`, invoiceStatusCompleted, from, to).Scan(&rows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query profit data"})
		return
	}

	if rows == nil {
		rows = []ProfitDataPoint{}
	}

	c.JSON(http.StatusOK, rows)
}

// GetTopProducts — GET /api/reports/top-products?from=&to=&limit=10&sort=desc
func GetTopProducts(c *gin.Context) {
	from, to, err := parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	// Parse limit (default 10, max 50)
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		parsed, err := strconv.Atoi(limitStr)
		if err != nil || parsed < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit"})
			return
		}
		if parsed > 50 {
			parsed = 50
		}
		limit = parsed
	}

	// Parse sort — only allow "asc" or "desc", never pass user input directly into SQL
	sortOrder := "DESC"
	if s := c.DefaultQuery("sort", "desc"); s == "asc" {
		sortOrder = "ASC"
	}

	rows, err := queryTopProducts(from, to, sortOrder, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query top products"})
		return
	}

	if rows == nil {
		rows = []TopProductItem{}
	}

	c.JSON(http.StatusOK, rows)
}

// GetCompareReport — GET /api/reports/compare
// Compares current month (1st → today) vs previous month (1st → end).
func GetCompareReport(c *gin.Context) {
	currentFrom, currentTo, previousFrom, previousTo := compareMonthRanges()

	current, err := getPeriodSummary(currentFrom, currentTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query current period"})
		return
	}

	previous, err := getPeriodSummary(previousFrom, previousTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query previous period"})
		return
	}

	// Weekly breakdown for both periods
	currentWeekly, err := queryWeeklyRevenue(currentFrom, currentTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query current weekly data"})
		return
	}

	previousWeekly, err := queryWeeklyRevenue(previousFrom, previousTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query previous weekly data"})
		return
	}

	// Merge into a unified weekly list keyed by week number
	weekMap := make(map[int]*CompareWeeklyItem)

	for _, row := range currentWeekly {
		item := weekMap[row.Week]
		if item == nil {
			item = &CompareWeeklyItem{Week: row.Week}
			weekMap[row.Week] = item
		}
		item.CurrentRevenue = row.Revenue
	}

	for _, row := range previousWeekly {
		item := weekMap[row.Week]
		if item == nil {
			item = &CompareWeeklyItem{Week: row.Week}
			weekMap[row.Week] = item
		}
		item.PreviousRevenue = row.Revenue
	}

	weekly := make([]CompareWeeklyItem, 0, len(weekMap))
	for _, item := range weekMap {
		weekly = append(weekly, *item)
	}

	// Sort by week number for stable output
	sort.Slice(weekly, func(i, j int) bool {
		return weekly[i].Week < weekly[j].Week
	})

	c.JSON(http.StatusOK, CompareReport{
		Current:  current,
		Previous: previous,
		Weekly:   weekly,
	})
}

// --- Excel Export Handlers ---

// ExportRevenueExcel — GET /api/reports/revenue/export?from=&to=
func ExportRevenueExcel(c *gin.Context) {
	from, to, err := parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	// Cap at 1 year to prevent unbounded exports
	if to.Sub(from).Hours() > 366*24 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Date range must not exceed 1 year"})
		return
	}

	rows, err := queryDailyRevenue(from, to)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query daily revenue"})
		return
	}

	f := excelize.NewFile()
	defer f.Close()
	sheet := "Doanh thu"
	f.SetSheetName("Sheet1", sheet)

	// Headers
	f.SetCellValue(sheet, "A1", "Ngày")
	f.SetCellValue(sheet, "B1", "Doanh thu (đ)")
	f.SetCellValue(sheet, "C1", "Số hóa đơn")

	// Rows
	for i, row := range rows {
		r := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", r), row.Date)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", r), row.Revenue)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", r), row.InvoiceCount)
	}

	filename := fmt.Sprintf("doanh-thu-%s-%s.xlsx", from.Format("2006-01-02"), to.Format("2006-01-02"))
	sendExcel(c, f, filename)
}

// ExportTopProductsExcel — GET /api/reports/top-products/export?from=&to=&sort=desc
func ExportTopProductsExcel(c *gin.Context) {
	from, to, err := parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	sortOrder := "DESC"
	sortLabel := "ban-chay"
	if s := c.DefaultQuery("sort", "desc"); s == "asc" {
		sortOrder = "ASC"
		sortLabel = "ban-e"
	}

	rows, err := queryTopProducts(from, to, sortOrder, 50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query top products"})
		return
	}

	f := excelize.NewFile()
	defer f.Close()
	sheet := "Top san pham"
	f.SetSheetName("Sheet1", sheet)

	// Headers
	f.SetCellValue(sheet, "A1", "#")
	f.SetCellValue(sheet, "B1", "Sản phẩm")
	f.SetCellValue(sheet, "C1", "SL bán")
	f.SetCellValue(sheet, "D1", "Doanh thu (đ)")
	f.SetCellValue(sheet, "E1", "Lợi nhuận (đ)")

	// Rows
	for i, row := range rows {
		r := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", r), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", r), row.ProductName)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", r), row.TotalQty)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", r), row.Revenue)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", r), row.Profit)
	}

	filename := fmt.Sprintf("top-products-%s-%s-%s.xlsx", sortLabel, from.Format("2006-01-02"), to.Format("2006-01-02"))
	sendExcel(c, f, filename)
}

// ExportCompareExcel — GET /api/reports/compare/export
func ExportCompareExcel(c *gin.Context) {
	currentFrom, currentTo, previousFrom, previousTo := compareMonthRanges()

	current, err := getPeriodSummary(currentFrom, currentTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query current period"})
		return
	}

	previous, err := getPeriodSummary(previousFrom, previousTo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query previous period"})
		return
	}

	f := excelize.NewFile()
	defer f.Close()
	sheet := "So sanh"
	f.SetSheetName("Sheet1", sheet)

	// Headers
	f.SetCellValue(sheet, "A1", "Chỉ số")
	f.SetCellValue(sheet, "B1", "Tháng trước")
	f.SetCellValue(sheet, "C1", "Tháng này")
	f.SetCellValue(sheet, "D1", "Chênh lệch")

	// Row 2: Doanh thu
	f.SetCellValue(sheet, "A2", "Doanh thu")
	f.SetCellValue(sheet, "B2", previous.Revenue)
	f.SetCellValue(sheet, "C2", current.Revenue)
	f.SetCellValue(sheet, "D2", current.Revenue-previous.Revenue)

	// Row 3: Lợi nhuận
	f.SetCellValue(sheet, "A3", "Lợi nhuận")
	f.SetCellValue(sheet, "B3", previous.Profit)
	f.SetCellValue(sheet, "C3", current.Profit)
	f.SetCellValue(sheet, "D3", current.Profit-previous.Profit)

	// Row 4: Số hóa đơn
	f.SetCellValue(sheet, "A4", "Số hóa đơn")
	f.SetCellValue(sheet, "B4", previous.InvoiceCount)
	f.SetCellValue(sheet, "C4", current.InvoiceCount)
	f.SetCellValue(sheet, "D4", current.InvoiceCount-previous.InvoiceCount)

	filename := fmt.Sprintf("so-sanh-%s.xlsx", time.Now().Format("2006-01"))
	sendExcel(c, f, filename)
}
