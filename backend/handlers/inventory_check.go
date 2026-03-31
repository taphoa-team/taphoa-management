package handlers

import (
	"net/http"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type InventoryCheckItemRequest struct {
	ProductID      uint    `json:"product_id" binding:"required"`
	ActualQuantity int     `json:"actual_quantity" binding:"min=0"`
	Note           *string `json:"note"`
}

// CreateInventoryCheck — tạo đợt kiểm kê, tự điền system_quantity
// FIX 3.2: Batch query thay vì N+1
func CreateInventoryCheck(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		Note *string `json:"note"`
	}
	c.ShouldBindJSON(&req)

	// FIX N2: Wrap trong transaction
	tx := config.DB.Begin()

	check := models.InventoryCheck{
		UserID: userID.(uint),
		Status: "draft",
		Note:   req.Note,
	}
	tx.Create(&check)

	// FIX 3.2: Batch query cho stock
	type stockResult struct {
		ProductID uint
		Total     int
	}
	var stocks []stockResult
	tx.Model(&models.ProductBatch{}).
		Select("product_id, COALESCE(SUM(quantity), 0) as total").
		Group("product_id").
		Find(&stocks)

	stockMap := make(map[uint]int)
	for _, s := range stocks {
		stockMap[s.ProductID] = s.Total
	}

	var products []models.Product
	tx.Where("is_active = ?", true).Find(&products)

	// FIX 3.2: Batch insert thay vì N+1
	var items []models.InventoryCheckItem
	for _, p := range products {
		stock := stockMap[p.ID]
		items = append(items, models.InventoryCheckItem{
			CheckID:        check.ID,
			ProductID:      p.ID,
			SystemQuantity: stock,
			ActualQuantity: stock,
			Difference:     0,
		})
	}
	if len(items) > 0 {
		tx.Create(&items)
	}

	tx.Commit()

	config.DB.Preload("User").Preload("Items.Product").First(&check, check.ID)
	c.JSON(http.StatusCreated, check)
}

// UpdateInventoryCheckItems — NV cập nhật số thực tế
func UpdateInventoryCheckItems(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

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
				"difference":     gorm.Expr("? - system_quantity", item.ActualQuantity),
				"note":           item.Note,
			})
	}

	config.DB.Preload("Items.Product").First(&check, check.ID)
	c.JSON(http.StatusOK, check)
}

// ConfirmInventoryCheck — xác nhận kiểm kê → điều chỉnh tồn kho theo actual
// FIX 2.7: Duyệt qua nhiều batch khi difference lớn
func ConfirmInventoryCheck(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

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

		if item.Difference < 0 {
			// FIX 2.7: Trừ qua nhiều batch nếu cần
			remaining := -item.Difference
			var batches []models.ProductBatch
			tx.Where("product_id = ? AND quantity > 0", item.ProductID).
				Order("created_at DESC").Find(&batches)
			for i := range batches {
				if remaining <= 0 {
					break
				}
				deduct := batches[i].Quantity
				if deduct > remaining {
					deduct = remaining
				}
				batches[i].Quantity -= deduct
				tx.Save(&batches[i])
				remaining -= deduct
			}
		} else {
			// Cộng vào batch mới nhất hoặc tạo adjustment batch
			var batch models.ProductBatch
			if err := tx.Where("product_id = ? AND quantity > 0", item.ProductID).
				Order("created_at DESC").First(&batch).Error; err != nil {
				// Không có batch → tạo mới
				newBatch := models.ProductBatch{
					ProductID:  item.ProductID,
					CostPrice:  0,
					Quantity:   item.Difference,
					ReceivedAt: time.Now(),
				}
				tx.Create(&newBatch)
			} else {
				batch.Quantity += item.Difference
				tx.Save(&batch)
			}
		}
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
	id, ok := parseID(c)
	if !ok {
		return
	}

	var check models.InventoryCheck
	if err := config.DB.Preload("User").Preload("Items.Product").First(&check, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đợt kiểm kê"})
		return
	}

	c.JSON(http.StatusOK, check)
}
