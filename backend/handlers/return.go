package handlers

import (
	"net/http"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

type ReturnItemRequest struct {
	ProductID   uint `json:"product_id" binding:"required"`
	BatchID     uint `json:"batch_id" binding:"required"`
	Quantity    int  `json:"quantity" binding:"required"`
	RefundPrice int  `json:"refund_price" binding:"required"`
}

type ReturnRequest struct {
	InvoiceID uint                `json:"invoice_id" binding:"required"`
	Reason    string              `json:"reason" binding:"required"`
	Items     []ReturnItemRequest `json:"items" binding:"required,min=1"`
}

// CreateReturn — tạo phiếu trả hàng → cộng lại tồn kho
func CreateReturn(c *gin.Context) {
	var req ReturnRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ: " + err.Error()})
		return
	}

	// Kiểm tra đơn hàng gốc
	var invoice models.Invoice
	if err := config.DB.First(&invoice, req.InvoiceID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng gốc"})
		return
	}

	if invoice.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Đơn hàng đã bị hủy — không trả hàng được"})
		return
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
			Update("quantity", config.DB.Raw("quantity + ?", item.Quantity))
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

	// Nếu đơn gốc là mua nợ → trừ nợ
	if invoice.PaymentMethod == "debt" && invoice.CustomerID != nil {
		debt := models.Debt{
			CustomerID: *invoice.CustomerID,
			Type:       "payment",
			Amount:     totalRefund,
		}
		tx.Create(&debt)
		tx.Model(&models.Customer{}).Where("id = ?", *invoice.CustomerID).
			Update("total_debt", config.DB.Raw("total_debt - ?", totalRefund))
	}

	tx.Commit()

	config.DB.Preload("Items.Product").Preload("User").First(&ret, ret.ID)
	c.JSON(http.StatusCreated, ret)
}

// ListReturns — danh sách phiếu trả hàng
func ListReturns(c *gin.Context) {
	var returns []models.Return
	config.DB.Preload("User").Preload("Invoice").Order("created_at DESC").Limit(100).Find(&returns)
	c.JSON(http.StatusOK, returns)
}
