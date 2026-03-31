package handlers

import (
	"net/http"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type WasteRequest struct {
	ProductID uint    `json:"product_id" binding:"required"`
	BatchID   uint    `json:"batch_id" binding:"required"`
	Quantity  int     `json:"quantity" binding:"required,gt=0"`
	Reason    string  `json:"reason" binding:"required,oneof=expired damaged lost other"`
	Note      *string `json:"note"`
}

// CreateWaste — tạo phiếu hủy → trừ tồn kho
func CreateWaste(c *gin.Context) {
	var req WasteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ: " + err.Error()})
		return
	}

	// Kiểm tra batch tồn tại
	var batch models.ProductBatch
	if err := config.DB.First(&batch, req.BatchID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy lô hàng"})
		return
	}

	// FIX 3.7: Validate batch thuộc đúng product
	if batch.ProductID != req.ProductID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lô hàng không thuộc sản phẩm này"})
		return
	}

	userID, _ := c.Get("user_id")

	tx := config.DB.Begin()

	waste := models.WasteRecord{
		ProductID: req.ProductID,
		BatchID:   req.BatchID,
		Quantity:  req.Quantity,
		Reason:    req.Reason,
		UserID:    userID.(uint),
		Note:      req.Note,
	}
	tx.Create(&waste)

	// FIX N3: Atomic deduction + check RowsAffected
	result := tx.Model(&models.ProductBatch{}).
		Where("id = ? AND product_id = ? AND quantity >= ?", req.BatchID, req.ProductID, req.Quantity).
		Update("quantity", gorm.Expr("quantity - ?", req.Quantity))
	if result.RowsAffected == 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Lô hàng không đủ số lượng để hủy"})
		return
	}

	tx.Commit()

	config.DB.Preload("Product").Preload("Batch").Preload("User").First(&waste, waste.ID)
	c.JSON(http.StatusCreated, waste)
}

// ListWaste — danh sách phiếu hủy
func ListWaste(c *gin.Context) {
	var records []models.WasteRecord
	config.DB.Preload("Product").Preload("User").Order("created_at DESC").Limit(100).Find(&records)
	c.JSON(http.StatusOK, records)
}
