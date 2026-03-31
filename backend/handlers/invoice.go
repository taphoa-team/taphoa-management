package handlers

import (
	"net/http"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

// --- Request structs ---

type InvoiceItemRequest struct {
	ProductID uint   `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required"`
	Unit      string `json:"unit" binding:"required"`
}

type InvoiceRequest struct {
	CustomerID     *uint                `json:"customer_id"`
	DiscountAmount int                  `json:"discount_amount"`
	PaymentMethod  string               `json:"payment_method" binding:"required,oneof=cash transfer mixed debt"`
	CashAmount     int                  `json:"cash_amount"`
	TransferAmount int                  `json:"transfer_amount"`
	CashGiven      int                  `json:"cash_given"`
	Note           *string              `json:"note"`
	Items          []InvoiceItemRequest `json:"items" binding:"required,min=1"`
}

// --- Handlers ---

// CreateInvoice — tạo đơn bán hàng → trừ tồn kho FIFO → ghi nợ nếu cần
func CreateInvoice(c *gin.Context) {
	var req InvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ: " + err.Error()})
		return
	}

	userID, _ := c.Get("user_id")

	// Kiểm tra đang có ca mở
	var shift models.Shift
	if err := config.DB.Where("user_id = ? AND closed_at IS NULL", userID).First(&shift).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Chưa mở ca — mở ca trước khi bán hàng"})
		return
	}

	// Mua nợ phải có customer
	if req.PaymentMethod == "debt" && req.CustomerID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Mua nợ phải chọn khách hàng"})
		return
	}

	tx := config.DB.Begin()

	var total int
	var invoiceItems []models.InvoiceItem

	for _, item := range req.Items {
		// Quy đổi đơn vị
		baseQty, err := convertToBaseQuantity(tx, item.ProductID, item.Unit, item.Quantity)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Lấy giá bán
		var product models.Product
		if err := tx.First(&product, item.ProductID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Không tìm thấy sản phẩm"})
			return
		}

		// FIFO: trừ từ lô cũ nhất (sắp hết hạn trước)
		remaining := baseQty
		var batches []models.ProductBatch
		tx.Where("product_id = ? AND quantity > 0", item.ProductID).
			Order("COALESCE(expiry_date, '9999-12-31') ASC, received_at ASC").
			Find(&batches)

		for i := range batches {
			if remaining <= 0 {
				break
			}

			deduct := batches[i].Quantity
			if deduct > remaining {
				deduct = remaining
			}

			invoiceItems = append(invoiceItems, models.InvoiceItem{
				ProductID: item.ProductID,
				BatchID:   batches[i].ID,
				Quantity:  deduct,
				Unit:      item.Unit,
				Price:     product.SellPrice,
				CostPrice: batches[i].CostPrice,
			})

			total += product.SellPrice * deduct

			batches[i].Quantity -= deduct
			tx.Save(&batches[i])
			remaining -= deduct
		}

		if remaining > 0 {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Không đủ tồn kho: " + product.Name,
			})
			return
		}
	}

	finalTotal := total - req.DiscountAmount
	changeAmount := 0
	if req.CashGiven > 0 {
		changeAmount = req.CashGiven - req.CashAmount
	}

	invoice := models.Invoice{
		UserID:         userID.(uint),
		ShiftID:        shift.ID,
		CustomerID:     req.CustomerID,
		Total:          total,
		DiscountAmount: req.DiscountAmount,
		FinalTotal:     finalTotal,
		CashAmount:     req.CashAmount,
		TransferAmount: req.TransferAmount,
		CashGiven:      req.CashGiven,
		ChangeAmount:   changeAmount,
		PaymentMethod:  req.PaymentMethod,
		Note:           req.Note,
		Items:          invoiceItems,
	}

	if err := tx.Create(&invoice).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tạo được đơn hàng"})
		return
	}

	// Cập nhật shift
	shift.TotalSales += finalTotal
	shift.TotalInvoices++
	tx.Save(&shift)

	// Ghi nợ nếu mua nợ
	if req.PaymentMethod == "debt" && req.CustomerID != nil {
		debt := models.Debt{
			CustomerID: *req.CustomerID,
			InvoiceID:  &invoice.ID,
			Type:       "debt",
			Amount:     finalTotal,
		}
		tx.Create(&debt)

		// Cập nhật cache tổng nợ
		tx.Model(&models.Customer{}).Where("id = ?", *req.CustomerID).
			Update("total_debt", config.DB.Raw("total_debt + ?", finalTotal))
	}

	tx.Commit()

	config.DB.Preload("Items.Product").Preload("User").Preload("Customer").First(&invoice, invoice.ID)

	c.JSON(http.StatusCreated, invoice)
}

// ListInvoices — danh sách đơn bán hàng
func ListInvoices(c *gin.Context) {
	var invoices []models.Invoice
	query := config.DB.Preload("User").Preload("Customer").Order("created_at DESC")

	if date := c.Query("date"); date != "" {
		query = query.Where("DATE(created_at) = ?", date)
	}
	if shiftID := c.Query("shift_id"); shiftID != "" {
		query = query.Where("shift_id = ?", shiftID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Limit(100).Find(&invoices)
	c.JSON(http.StatusOK, invoices)
}

// GetInvoice — chi tiết 1 đơn hàng
func GetInvoice(c *gin.Context) {
	id := c.Param("id")

	var invoice models.Invoice
	if err := config.DB.Preload("Items.Product").Preload("User").Preload("Customer").
		First(&invoice, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng"})
		return
	}

	c.JSON(http.StatusOK, invoice)
}

// CancelInvoice — hủy đơn → cộng lại tồn kho, xóa nợ nếu có
func CancelInvoice(c *gin.Context) {
	id := c.Param("id")

	var invoice models.Invoice
	if err := config.DB.Preload("Items").First(&invoice, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng"})
		return
	}

	if invoice.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Đơn hàng đã bị hủy trước đó"})
		return
	}

	tx := config.DB.Begin()

	// Cộng lại tồn kho
	for _, item := range invoice.Items {
		tx.Model(&models.ProductBatch{}).Where("id = ?", item.BatchID).
			Update("quantity", config.DB.Raw("quantity + ?", item.Quantity))
	}

	// Xóa nợ nếu là đơn mua nợ
	if invoice.PaymentMethod == "debt" && invoice.CustomerID != nil {
		tx.Where("invoice_id = ?", invoice.ID).Delete(&models.Debt{})
		tx.Model(&models.Customer{}).Where("id = ?", *invoice.CustomerID).
			Update("total_debt", config.DB.Raw("total_debt - ?", invoice.FinalTotal))
	}

	// Cập nhật shift
	tx.Model(&models.Shift{}).Where("id = ?", invoice.ShiftID).
		Updates(map[string]interface{}{
			"total_sales":    config.DB.Raw("total_sales - ?", invoice.FinalTotal),
			"total_invoices": config.DB.Raw("total_invoices - 1"),
		})

	invoice.Status = "cancelled"
	tx.Save(&invoice)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Đã hủy đơn hàng"})
}
