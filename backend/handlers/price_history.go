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
	if err := config.DB.
		Preload("User").
		Where("product_id = ?", id).
		Order("created_at DESC").
		Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi truy vấn lịch sử giá"})
		return
	}

	c.JSON(http.StatusOK, history)
}
