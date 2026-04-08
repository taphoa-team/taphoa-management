package handlers

import (
	"net/http"
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
