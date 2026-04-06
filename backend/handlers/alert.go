package handlers

import (
	"log"
	"math"
	"net/http"
	"strconv"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"
	"taphoa-management/backend/services"

	"github.com/gin-gonic/gin"
)

// --- Response types ---

type ExpiryAlertItem struct {
	models.ProductBatch
	Product  models.Product `json:"product"`
	DaysLeft int            `json:"days_left"`
}

type LowStockItem struct {
	models.Product
	Stock   int    `json:"stock"`
	Warning string `json:"warning"`
}

type AlertSummary struct {
	Expiring7D  int `json:"expiring_7d"`
	Expiring30D int `json:"expiring_30d"`
	Expired     int `json:"expired"`
	LowStock    int `json:"low_stock"`
	OutOfStock  int `json:"out_of_stock"`
}

// --- Handlers ---

// ListExpiryAlerts — danh sách lô hàng sắp hết hạn
// Query params: days (mặc định 7), page, limit
func ListExpiryAlerts(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))
	if days < 1 {
		days = 7
	}

	now := time.Now()
	deadline := now.AddDate(0, 0, days)

	var batches []models.ProductBatch
	config.DB.Preload("Product").
		Where("quantity > 0 AND expiry_date IS NOT NULL AND expiry_date <= ?", deadline).
		Order("expiry_date ASC").
		Scopes(paginate(c)).
		Find(&batches)

	var result []ExpiryAlertItem
	for _, b := range batches {
		daysLeft := int(math.Ceil(b.ExpiryDate.Sub(now).Hours() / 24))
		result = append(result, ExpiryAlertItem{
			ProductBatch: b,
			Product:      b.Product,
			DaysLeft:     daysLeft,
		})
	}

	if result == nil {
		result = []ExpiryAlertItem{}
	}
	c.JSON(http.StatusOK, result)
}

// ListLowStockAlerts — danh sách SP có tồn kho thấp hoặc hết
func ListLowStockAlerts(c *gin.Context) {
	var products []models.Product
	config.DB.Preload("Category").Where("is_active = ?", true).Order("name").Find(&products)

	stockMap := getStockMap(config.DB)

	var result []LowStockItem
	for _, p := range products {
		stock := stockMap[p.ID]
		if stock > p.MinQuantity {
			continue
		}
		warning := "low"
		if stock == 0 {
			warning = "out"
		}
		result = append(result, LowStockItem{
			Product: p,
			Stock:   stock,
			Warning: warning,
		})
	}

	if result == nil {
		result = []LowStockItem{}
	}
	c.JSON(http.StatusOK, result)
}

// SendAlertEmail — gửi email cảnh báo thủ công (admin bấm nút)
func SendAlertEmail(c *gin.Context) {
	if err := services.SendAlertEmail(); err != nil {
		log.Printf("[Alert] Send email failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gửi email thất bại"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Đã gửi email cảnh báo"})
}

// GetAlertSummary — tổng hợp số lượng cảnh báo cho dashboard
func GetAlertSummary(c *gin.Context) {
	now := time.Now()
	day7 := now.AddDate(0, 0, 7)
	day30 := now.AddDate(0, 0, 30)

	var expiring7, expiring30, expired int64

	// Lô hết hạn trong 7 ngày (chưa hết hạn)
	config.DB.Model(&models.ProductBatch{}).
		Where("quantity > 0 AND expiry_date IS NOT NULL AND expiry_date > ? AND expiry_date <= ?", now, day7).
		Count(&expiring7)

	// Lô hết hạn trong 30 ngày (bao gồm 7 ngày)
	config.DB.Model(&models.ProductBatch{}).
		Where("quantity > 0 AND expiry_date IS NOT NULL AND expiry_date > ? AND expiry_date <= ?", now, day30).
		Count(&expiring30)

	// Lô đã hết hạn (chưa xuất hủy — vẫn còn quantity)
	config.DB.Model(&models.ProductBatch{}).
		Where("quantity > 0 AND expiry_date IS NOT NULL AND expiry_date <= ?", now).
		Count(&expired)

	// Tồn kho thấp + hết hàng
	var products []models.Product
	config.DB.Where("is_active = ?", true).Find(&products)
	stockMap := getStockMap(config.DB)

	var lowStock, outOfStock int
	for _, p := range products {
		stock := stockMap[p.ID]
		if stock == 0 {
			outOfStock++
		} else if stock <= p.MinQuantity {
			lowStock++
		}
	}

	c.JSON(http.StatusOK, AlertSummary{
		Expiring7D:  int(expiring7),
		Expiring30D: int(expiring30),
		Expired:     int(expired),
		LowStock:    lowStock,
		OutOfStock:  outOfStock,
	})
}
