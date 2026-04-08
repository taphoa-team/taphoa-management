package handlers

import (
	"net/http"
	"strconv"
	"time"

	"taphoa-management/backend/config"

	"github.com/gin-gonic/gin"
)

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

// --- Helpers ---

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

	// Include the full end day up to 23:59:59
	to := toDay.Add(24*time.Hour - time.Second)

	return from, to, nil
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
		WHERE status = 'completed'
		  AND created_at >= ?
		  AND created_at <= ?
	`, from, to).Scan(&summary).Error
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
		WHERE i.status = 'completed'
		  AND i.created_at >= ?
		  AND i.created_at <= ?
	`, from, to).Scan(&cogsResult).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query COGS"})
		return
	}

	// Daily breakdown
	type dailyRow struct {
		Date         string
		Revenue      float64
		InvoiceCount int
	}
	var dailyRows []dailyRow

	err = config.DB.Raw(`
		SELECT
			TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
			COALESCE(SUM(final_total), 0)     AS revenue,
			COUNT(*)                           AS invoice_count
		FROM invoices
		WHERE status = 'completed'
		  AND created_at >= ?
		  AND created_at <= ?
		GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
		ORDER BY date
	`, from, to).Scan(&dailyRows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query daily revenue"})
		return
	}

	daily := make([]RevenueDataPoint, 0, len(dailyRows))
	for _, row := range dailyRows {
		daily = append(daily, RevenueDataPoint{
			Date:         row.Date,
			Revenue:      row.Revenue,
			InvoiceCount: row.InvoiceCount,
		})
	}

	totalProfit := summary.TotalRevenue - cogsResult.TotalCOGS

	c.JSON(http.StatusOK, RevenueReport{
		TotalRevenue:  summary.TotalRevenue,
		TotalCOGS:     cogsResult.TotalCOGS,
		TotalProfit:   totalProfit,
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

	type dailyProfitRow struct {
		Date    string
		Revenue float64
		COGS    float64
		Profit  float64
	}
	var rows []dailyProfitRow

	err = config.DB.Raw(`
		SELECT
			TO_CHAR(i.created_at, 'YYYY-MM-DD')           AS date,
			COALESCE(SUM(i.final_total), 0)                AS revenue,
			COALESCE(SUM(ii.cost_price * ii.quantity), 0)  AS cogs,
			COALESCE(SUM(i.final_total), 0)
				- COALESCE(SUM(ii.cost_price * ii.quantity), 0) AS profit
		FROM invoices i
		JOIN invoice_items ii ON ii.invoice_id = i.id
		WHERE i.status = 'completed'
		  AND i.created_at >= ?
		  AND i.created_at <= ?
		GROUP BY TO_CHAR(i.created_at, 'YYYY-MM-DD')
		ORDER BY date
	`, from, to).Scan(&rows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query profit data"})
		return
	}

	daily := make([]ProfitDataPoint, 0, len(rows))
	for _, row := range rows {
		daily = append(daily, ProfitDataPoint{
			Date:    row.Date,
			Revenue: row.Revenue,
			COGS:    row.COGS,
			Profit:  row.Profit,
		})
	}

	c.JSON(http.StatusOK, gin.H{"daily": daily})
}

// --- Top Products ---

type TopProductItem struct {
	ProductID   uint   `json:"product_id"`
	ProductName string `json:"product_name"`
	TotalQty    int    `json:"total_qty"`
	Revenue     int    `json:"revenue"`
	Profit      int    `json:"profit"`
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

	var rows []TopProductItem

	query := `
		SELECT
			p.id                                           AS product_id,
			p.name                                         AS product_name,
			COALESCE(SUM(ii.quantity), 0)                  AS total_qty,
			COALESCE(SUM(ii.sell_price * ii.quantity), 0)  AS revenue,
			COALESCE(SUM((ii.sell_price - ii.cost_price) * ii.quantity), 0) AS profit
		FROM invoice_items ii
		JOIN invoices i   ON i.id   = ii.invoice_id
		JOIN products p   ON p.id   = ii.product_id
		WHERE i.status = 'completed'
		  AND i.created_at >= ?
		  AND i.created_at <= ?
		GROUP BY p.id, p.name
		ORDER BY total_qty ` + sortOrder + `
		LIMIT ?
	`

	err = config.DB.Raw(query, from, to, limit).Scan(&rows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query top products"})
		return
	}

	if rows == nil {
		rows = []TopProductItem{}
	}

	c.JSON(http.StatusOK, gin.H{"items": rows})
}

// --- Compare Report ---

type ComparePeriod struct {
	Revenue      int `json:"revenue"`
	COGS         int `json:"cogs"`
	Profit       int `json:"profit"`
	InvoiceCount int `json:"invoice_count"`
}

type CompareWeeklyItem struct {
	Week            int `json:"week"`
	CurrentRevenue  int `json:"current_revenue"`
	PreviousRevenue int `json:"previous_revenue"`
}

type CompareReport struct {
	Current  ComparePeriod       `json:"current"`
	Previous ComparePeriod       `json:"previous"`
	Weekly   []CompareWeeklyItem `json:"weekly"`
}

// getPeriodSummary returns revenue/cogs/profit/invoice_count for a time range.
func getPeriodSummary(from, to time.Time) (ComparePeriod, error) {
	var result struct {
		Revenue      int
		COGS         int
		InvoiceCount int
	}

	err := config.DB.Raw(`
		SELECT
			COALESCE(SUM(i.final_total), 0)                AS revenue,
			COALESCE(SUM(ii.cost_price * ii.quantity), 0)  AS cogs,
			COUNT(DISTINCT i.id)                           AS invoice_count
		FROM invoices i
		JOIN invoice_items ii ON ii.invoice_id = i.id
		WHERE i.status = 'completed'
		  AND i.created_at >= ?
		  AND i.created_at <= ?
	`, from, to).Scan(&result).Error
	if err != nil {
		return ComparePeriod{}, err
	}

	return ComparePeriod{
		Revenue:      result.Revenue,
		COGS:         result.COGS,
		Profit:       result.Revenue - result.COGS,
		InvoiceCount: result.InvoiceCount,
	}, nil
}

// GetCompareReport — GET /api/reports/compare
// Compares current month (1st → today) vs previous month (1st → end).
func GetCompareReport(c *gin.Context) {
	now := time.Now()

	// Current period: 1st of this month → end of today
	currentFrom := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	currentTo := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 0, now.Location())

	// Previous period: 1st of last month → last day of last month at 23:59:59
	firstOfThisMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	previousFrom := firstOfThisMonth.AddDate(0, -1, 0)
	previousTo := firstOfThisMonth.Add(-time.Second) // one second before 1st of this month = 23:59:59 of last day last month

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
	type weeklyRow struct {
		Week    int
		Revenue int
	}
	var currentWeekly, previousWeekly []weeklyRow

	err = config.DB.Raw(`
		SELECT
			EXTRACT(WEEK FROM created_at)::int AS week,
			COALESCE(SUM(final_total), 0)      AS revenue
		FROM invoices
		WHERE status = 'completed'
		  AND created_at >= ?
		  AND created_at <= ?
		GROUP BY EXTRACT(WEEK FROM created_at)
		ORDER BY week
	`, currentFrom, currentTo).Scan(&currentWeekly).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query current weekly data"})
		return
	}

	err = config.DB.Raw(`
		SELECT
			EXTRACT(WEEK FROM created_at)::int AS week,
			COALESCE(SUM(final_total), 0)      AS revenue
		FROM invoices
		WHERE status = 'completed'
		  AND created_at >= ?
		  AND created_at <= ?
		GROUP BY EXTRACT(WEEK FROM created_at)
		ORDER BY week
	`, previousFrom, previousTo).Scan(&previousWeekly).Error
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
	for i := 0; i < len(weekly)-1; i++ {
		for j := i + 1; j < len(weekly); j++ {
			if weekly[i].Week > weekly[j].Week {
				weekly[i], weekly[j] = weekly[j], weekly[i]
			}
		}
	}

	c.JSON(http.StatusOK, CompareReport{
		Current:  current,
		Previous: previous,
		Weekly:   weekly,
	})
}
