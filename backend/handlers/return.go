package handlers

import (
	"net/http"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ReturnItemRequest struct {
	ProductID   uint `json:"product_id" binding:"required"`
	BatchID     uint `json:"batch_id" binding:"required"`
	Quantity    int  `json:"quantity" binding:"required,gt=0"`
	RefundPrice int  `json:"refund_price" binding:"required,gt=0"`
}

type ReturnRequest struct {
	InvoiceID uint                `json:"invoice_id" binding:"required"`
	Reason    string              `json:"reason" binding:"required"`
	Items     []ReturnItemRequest `json:"items" binding:"required,min=1"`
}

// CreateReturn — tạo phiếu trả hàng → cộng lại tồn kho
// FIX 2.3: Validate quantity so với invoice gốc
func CreateReturn(c *gin.Context) {
	var req ReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ: " + err.Error()})
		return
	}

	// Kiểm tra đơn hàng gốc
	var invoice models.Invoice
	if err := config.DB.Preload("Items").First(&invoice, req.InvoiceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng gốc"})
		return
	}

	if invoice.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Đơn hàng đã bị hủy — không trả hàng được"})
		return
	}

	// FIX 2.3: Build map số lượng đã bán theo (productID, batchID)
	soldMap := make(map[[2]uint]int)
	for _, ii := range invoice.Items {
		key := [2]uint{ii.ProductID, ii.BatchID}
		soldMap[key] += ii.Quantity
	}

	// FIX 2.3: Build map số lượng đã trả trước đó
	var existingReturnItems []models.ReturnItem
	config.DB.Joins("JOIN returns ON returns.id = return_items.return_id").
		Where("returns.invoice_id = ? AND returns.status = ?", req.InvoiceID, "completed").
		Find(&existingReturnItems)

	returnedMap := make(map[[2]uint]int)
	for _, ri := range existingReturnItems {
		key := [2]uint{ri.ProductID, ri.BatchID}
		returnedMap[key] += ri.Quantity
	}

	// FIX 2.3: Validate từng item
	// FIX R15: Validate refundPrice <= giá bán gốc
	priceMap := make(map[[2]uint]int)
	for _, ii := range invoice.Items {
		key := [2]uint{ii.ProductID, ii.BatchID}
		priceMap[key] = ii.Price
	}

	for _, item := range req.Items {
		key := [2]uint{item.ProductID, item.BatchID}
		available := soldMap[key] - returnedMap[key]
		if item.Quantity > available {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Vượt quá số lượng cho phép trả"})
			return
		}
		if originalPrice, ok := priceMap[key]; ok && item.RefundPrice > originalPrice {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Giá hoàn không được cao hơn giá bán gốc"})
			return
		}
	}

	userID, _ := c.Get("user_id")

	tx := config.DB.Begin()

	var totalRefund int
	var items []models.ReturnItem

	for _, item := range req.Items {
		totalRefund += item.RefundPrice * item.Quantity

		items = append(items, models.ReturnItem{
			ProductID:   item.ProductID,
			BatchID:     item.BatchID,
			Quantity:    item.Quantity,
			RefundPrice: item.RefundPrice,
		})

		// Cộng lại tồn kho
		tx.Model(&models.ProductBatch{}).Where("id = ?", item.BatchID).
			Update("quantity", gorm.Expr("quantity + ?", item.Quantity))
	}

	ret := models.Return{
		InvoiceID:   req.InvoiceID,
		UserID:      userID.(uint),
		Reason:      req.Reason,
		TotalRefund: totalRefund,
		Items:       items,
	}

	if err := tx.Create(&ret).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tạo được phiếu trả"})
		return
	}

	// FIX N5: Adjust shift stats (trừ doanh thu ca)
	tx.Model(&models.Shift{}).Where("id = ?", invoice.ShiftID).
		Updates(map[string]interface{}{
			"total_sales": gorm.Expr("total_sales - ?", totalRefund),
		})

	// Nếu đơn gốc là mua nợ → trừ nợ
	// FIX R3: Chỉ tạo debt record khi total_debt thực sự giảm
	if invoice.PaymentMethod == "debt" && invoice.CustomerID != nil {
		result := tx.Model(&models.Customer{}).
			Where("id = ? AND total_debt >= ?", *invoice.CustomerID, totalRefund).
			Update("total_debt", gorm.Expr("total_debt - ?", totalRefund))

		if result.RowsAffected > 0 {
			debt := models.Debt{
				CustomerID: *invoice.CustomerID,
				Type:       "payment",
				Amount:     totalRefund,
			}
			tx.Create(&debt)
		}
		// Nếu total_debt < totalRefund → không tạo debt record, tránh inconsistency
	}

	tx.Commit()

	config.DB.Preload("Items.Product").Preload("User").First(&ret, ret.ID)
	c.JSON(http.StatusCreated, ret)
}

// ListReturns — danh sách phiếu trả hàng
func ListReturns(c *gin.Context) {
	var returns []models.Return
	config.DB.Preload("User").Preload("Invoice").Scopes(paginate(c)).Order("created_at DESC").Find(&returns)
	c.JSON(http.StatusOK, returns)
}
