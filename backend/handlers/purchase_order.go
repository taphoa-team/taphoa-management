package handlers

import (
	"net/http"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// --- Request structs ---

type PurchaseOrderItemRequest struct {
	ProductID  uint       `json:"product_id" binding:"required"`
	Quantity   int        `json:"quantity" binding:"required,gt=0"`
	Unit       string     `json:"unit" binding:"required"`
	CostPrice  int        `json:"cost_price" binding:"required,gt=0"`
	ExpiryDate *time.Time `json:"expiry_date"`
}

type PurchaseOrderRequest struct {
	SupplierID uint                       `json:"supplier_id" binding:"required"`
	Paid       int                        `json:"paid" binding:"min=0"`
	Note       *string                    `json:"note"`
	Items      []PurchaseOrderItemRequest `json:"items" binding:"required,min=1"`
}

// --- Handlers ---

// ListPurchaseOrders — danh sách đơn nhập hàng
func ListPurchaseOrders(c *gin.Context) {
	var orders []models.PurchaseOrder
	config.DB.Preload("Supplier").Preload("User").
		Order("created_at DESC").Find(&orders)
	c.JSON(http.StatusOK, orders)
}

// GetPurchaseOrder — chi tiết 1 đơn nhập
func GetPurchaseOrder(c *gin.Context) {
	id := c.Param("id")

	var order models.PurchaseOrder
	if err := config.DB.Preload("Supplier").Preload("User").
		Preload("Items.Product").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn nhập"})
		return
	}

	c.JSON(http.StatusOK, order)
}

// CreatePurchaseOrder — tạo đơn nhập → tạo batches → cộng tồn kho
func CreatePurchaseOrder(c *gin.Context) {
	var req PurchaseOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ: " + err.Error()})
		return
	}

	userID, _ := c.Get("user_id")

	tx := config.DB.Begin()

	var total int
	var items []models.PurchaseOrderItem

	for _, item := range req.Items {
		// Quy đổi đơn vị về đơn vị gốc
		baseQty, err := convertToBaseQuantity(tx, item.ProductID, item.Unit, item.Quantity)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		total += item.CostPrice * item.Quantity

		// Tạo lô hàng mới
		batch := models.ProductBatch{
			ProductID:  item.ProductID,
			CostPrice:  item.CostPrice,
			Quantity:   baseQty,
			ExpiryDate: item.ExpiryDate,
			ReceivedAt: time.Now(),
		}
		if err := tx.Create(&batch).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tạo được lô hàng"})
			return
		}

		// FIX 2.4: Lưu Unit + BatchID vào PurchaseOrderItem
		items = append(items, models.PurchaseOrderItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			Unit:      item.Unit,
			CostPrice: item.CostPrice,
			BatchID:   batch.ID,
		})
	}

	order := models.PurchaseOrder{
		UserID:     userID.(uint),
		SupplierID: req.SupplierID,
		Total:      total,
		Paid:       req.Paid,
		Note:       req.Note,
		Items:      items,
	}

	if err := tx.Create(&order).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tạo được đơn nhập"})
		return
	}

	tx.Commit()

	config.DB.Preload("Supplier").Preload("User").Preload("Items.Product").First(&order, order.ID)

	c.JSON(http.StatusCreated, order)
}

// CancelPurchaseOrder — hủy đơn nhập → trừ lại tồn kho từ đúng batch
// FIX 1.2: Dùng item.Unit + item.BatchID thay vì "base" + đoán batch
func CancelPurchaseOrder(c *gin.Context) {
	id := c.Param("id")

	var order models.PurchaseOrder
	if err := config.DB.Preload("Items").First(&order, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn nhập"})
		return
	}

	if order.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Đơn nhập đã bị hủy trước đó"})
		return
	}

	tx := config.DB.Begin()

	for _, item := range order.Items {
		// FIX 1.2: Quy đổi đúng unit
		baseQty, err := convertToBaseQuantity(tx, item.ProductID, item.Unit, item.Quantity)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi quy đổi: " + err.Error()})
			return
		}

		// FIX 1.2: Trừ đúng batch do PO này tạo
		result := tx.Model(&models.ProductBatch{}).
			Where("id = ? AND quantity >= ?", item.BatchID, baseQty).
			Update("quantity", gorm.Expr("quantity - ?", baseQty))
		if result.RowsAffected == 0 {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "Không đủ tồn kho trong lô để hủy đơn nhập"})
			return
		}
	}

	order.Status = "cancelled"
	tx.Save(&order)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Đã hủy đơn nhập"})
}
