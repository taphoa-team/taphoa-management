package handlers

import (
	"net/http"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

type InventoryCheckItemRequest struct {
	ProductID      uint    `json:"product_id" binding:"required"`
	ActualQuantity int     `json:"actual_quantity" binding:"required"`
	Note           *string `json:"note"`
}

// CreateInventoryCheck — tạo đợt kiểm kê, tự điền system_quantity
func CreateInventoryCheck(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		Note *string `json:"note"`
	}
	c.ShouldBindJSON(&req)

	check := models.InventoryCheck{
		UserID: userID.(uint),
		Status: "draft",
		Note:   req.Note,
	}
	config.DB.Create(&check)

	// Tự tạo items cho tất cả SP đang active, kèm system_quantity
	var products []models.Product
	config.DB.Where("is_active = ?", true).Find(&products)

	for _, p := range products {
		var stock int
		config.DB.Model(&models.ProductBatch{}).
			Where("product_id = ?", p.ID).
			Select("COALESCE(SUM(quantity), 0)").
			Scan(&stock)

		item := models.InventoryCheckItem{
			CheckID:        check.ID,
			ProductID:      p.ID,
			SystemQuantity: stock,
			ActualQuantity: stock, // mặc định = system, NV sửa sau
			Difference:     0,
		}
		config.DB.Create(&item)
	}

	config.DB.Preload("User").Preload("Items.Product").First(&check, check.ID)
	c.JSON(http.StatusCreated, check)
}

// UpdateInventoryCheckItems — NV cập nhật số thực tế
func UpdateInventoryCheckItems(c *gin.Context) {
	id := c.Param("id")

	var check models.InventoryCheck
	if err := config.DB.First(&check, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đợt kiểm kê"})
		return
	}

	if check.Status == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Đợt kiểm kê đã hoàn thành"})
		return
	}

	var req struct {
		Items []InventoryCheckItemRequest `json:"items" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}

	for _, item := range req.Items {
		config.DB.Model(&models.InventoryCheckItem{}).
			Where("check_id = ? AND product_id = ?", check.ID, item.ProductID).
			Updates(map[string]interface{}{
				"actual_quantity": item.ActualQuantity,
				"difference":     config.DB.Raw("? - system_quantity", item.ActualQuantity),
				"note":           item.Note,
			})
	}

	config.DB.Preload("Items.Product").First(&check, check.ID)
	c.JSON(http.StatusOK, check)
}

// ConfirmInventoryCheck — xác nhận kiểm kê → điều chỉnh tồn kho theo actual
func ConfirmInventoryCheck(c *gin.Context) {
	id := c.Param("id")

	var check models.InventoryCheck
	if err := config.DB.Preload("Items").First(&check, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đợt kiểm kê"})
		return
	}

	if check.Status == "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Đợt kiểm kê đã hoàn thành"})
		return
	}

	tx := config.DB.Begin()

	for _, item := range check.Items {
		if item.Difference == 0 {
			continue
		}

		// Điều chỉnh batch mới nhất (hoặc tạo adjustment batch)
		var batch models.ProductBatch
		if err := tx.Where("product_id = ? AND quantity > 0", item.ProductID).
			Order("created_at DESC").First(&batch).Error; err != nil {
			// Không có batch → tạo mới nếu actual > 0
			if item.ActualQuantity > 0 {
				newBatch := models.ProductBatch{
					ProductID:  item.ProductID,
					CostPrice:  0,
					Quantity:   item.ActualQuantity,
					ReceivedAt: time.Now(),
				}
				tx.Create(&newBatch)
			}
			continue
		}

		// Điều chỉnh: cộng/trừ difference vào batch
		batch.Quantity += item.Difference
		if batch.Quantity < 0 {
			batch.Quantity = 0
		}
		tx.Save(&batch)
	}

	now := time.Now()
	check.Status = "completed"
	check.CompletedAt = &now
	tx.Save(&check)

	tx.Commit()

	config.DB.Preload("User").Preload("Items.Product").First(&check, check.ID)
	c.JSON(http.StatusOK, check)
}

// ListInventoryChecks — danh sách đợt kiểm kê
func ListInventoryChecks(c *gin.Context) {
	var checks []models.InventoryCheck
	config.DB.Preload("User").Order("created_at DESC").Limit(20).Find(&checks)
	c.JSON(http.StatusOK, checks)
}

// GetInventoryCheck — chi tiết 1 đợt kiểm kê
func GetInventoryCheck(c *gin.Context) {
	id := c.Param("id")

	var check models.InventoryCheck
	if err := config.DB.Preload("User").Preload("Items.Product").First(&check, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đợt kiểm kê"})
		return
	}

	c.JSON(http.StatusOK, check)
}
