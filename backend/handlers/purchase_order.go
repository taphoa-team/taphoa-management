package handlers

import (
	"net/http"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

// --- Request structs ---

type PurchaseOrderItemRequest struct {
	ProductID  uint       `json:"product_id" binding:"required"`
	Quantity   int        `json:"quantity" binding:"required"`
	Unit       string     `json:"unit" binding:"required"`
	CostPrice  int        `json:"cost_price" binding:"required"`
	ExpiryDate *time.Time `json:"expiry_date"`
}

type PurchaseOrderRequest struct {
	SupplierID uint                       `json:"supplier_id" binding:"required"`
	Paid       int                        `json:"paid"`
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

	// Bắt đầu transaction — tất cả thành công hoặc tất cả rollback
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

		items = append(items, models.PurchaseOrderItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
			CostPrice: item.CostPrice,
		})

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
	}

	// Tạo đơn nhập
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

	// Load lại để trả về đầy đủ
	config.DB.Preload("Supplier").Preload("User").Preload("Items.Product").First(&order, order.ID)

	c.JSON(http.StatusCreated, order)
}

// CancelPurchaseOrder — hủy đơn nhập → trừ lại tồn kho
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

	// Trừ lại tồn kho — tìm batch gần nhất của sản phẩm và trừ
	for _, item := range order.Items {
		baseQty, _ := convertToBaseQuantity(tx, item.ProductID, "base", item.Quantity)
		// Tìm batch mới nhất của SP này để trừ
		var batch models.ProductBatch
		if err := tx.Where("product_id = ? AND quantity >= ?", item.ProductID, baseQty).
			Order("created_at DESC").First(&batch).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "Không đủ tồn kho để hủy đơn nhập"})
			return
		}
		batch.Quantity -= baseQty
		tx.Save(&batch)
	}

	order.Status = "cancelled"
	tx.Save(&order)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Đã hủy đơn nhập"})
}
