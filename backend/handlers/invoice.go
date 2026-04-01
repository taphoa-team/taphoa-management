package handlers

import (
	"net/http"
	"strconv"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// --- Request structs ---

type InvoiceItemRequest struct {
	ProductID uint   `json:"product_id" binding:"required"`
	Quantity  int    `json:"quantity" binding:"required,gt=0"`
	Unit      string `json:"unit" binding:"required"`
}

type InvoiceRequest struct {
	CustomerID     *uint                `json:"customer_id"`
	DiscountAmount int                  `json:"discount_amount" binding:"min=0"`
	PaymentMethod  string               `json:"payment_method" binding:"required,oneof=cash transfer mixed debt"`
	CashAmount     int                  `json:"cash_amount" binding:"min=0"`
	TransferAmount int                  `json:"transfer_amount" binding:"min=0"`
	CashGiven      int                  `json:"cash_given" binding:"min=0"`
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
				Unit:      product.Unit,
				Price:     product.SellPrice,
				CostPrice: batches[i].CostPrice,
			})

			total += product.SellPrice * deduct

			// FIX N4: Atomic deduction thay vì read-modify-write
			result := tx.Model(&models.ProductBatch{}).
				Where("id = ? AND quantity >= ?", batches[i].ID, deduct).
				Update("quantity", gorm.Expr("quantity - ?", deduct))
			if result.RowsAffected == 0 {
				tx.Rollback()
				c.JSON(http.StatusConflict, gin.H{"error": "Tồn kho đã thay đổi, vui lòng thử lại"})
				return
			}
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

	// FIX 2.5: Validate thanh toán đủ
	switch req.PaymentMethod {
	case "cash":
		if req.CashAmount < finalTotal {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tiền mặt không đủ"})
			return
		}
	case "transfer":
		if req.TransferAmount < finalTotal {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tiền chuyển khoản không đủ"})
			return
		}
	case "mixed":
		if req.CashAmount+req.TransferAmount < finalTotal {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tổng thanh toán không đủ"})
			return
		}
	}

	// FIX R16: Validate CashGiven >= CashAmount
	changeAmount := 0
	if req.CashGiven > 0 {
		if req.CashGiven < req.CashAmount {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Tiền khách đưa không đủ"})
			return
		}
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

	// FIX N1: Atomic shift update
	tx.Model(&models.Shift{}).Where("id = ?", shift.ID).
		Updates(map[string]interface{}{
			"total_sales":    gorm.Expr("total_sales + ?", finalTotal),
			"total_invoices": gorm.Expr("total_invoices + 1"),
		})

	// Ghi nợ nếu mua nợ
	if req.PaymentMethod == "debt" && req.CustomerID != nil {
		debt := models.Debt{
			CustomerID: *req.CustomerID,
			InvoiceID:  &invoice.ID,
			Type:       "debt",
			Amount:     finalTotal,
		}
		tx.Create(&debt)

		tx.Model(&models.Customer{}).Where("id = ?", *req.CustomerID).
			Update("total_debt", gorm.Expr("total_debt + ?", finalTotal))
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
	// FIX R18: Validate shift_id là số
	if shiftID := c.Query("shift_id"); shiftID != "" {
		if _, err := strconv.ParseUint(shiftID, 10, 32); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "shift_id không hợp lệ"})
			return
		}
		query = query.Where("shift_id = ?", shiftID)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	query.Scopes(paginate(c)).Find(&invoices)
	c.JSON(http.StatusOK, invoices)
}

// GetInvoice — chi tiết 1 đơn hàng
func GetInvoice(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var invoice models.Invoice
	if err := config.DB.Preload("Items.Product").Preload("User").Preload("Customer").
		First(&invoice, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng"})
		return
	}

	c.JSON(http.StatusOK, invoice)
}

// CancelInvoice — hủy đơn → cộng lại tồn kho (trừ phần đã return), xóa nợ nếu có
// FIX 1.1: Không cho cancel nếu đã có return
func CancelInvoice(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var invoice models.Invoice
	if err := config.DB.Preload("Items").First(&invoice, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy đơn hàng"})
		return
	}

	if invoice.Status == "cancelled" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Đơn hàng đã bị hủy trước đó"})
		return
	}

	// FIX 1.1: Kiểm tra đã có return chưa — nếu có thì không cho cancel
	var returnCount int64
	config.DB.Model(&models.Return{}).Where("invoice_id = ? AND status = ?", invoice.ID, "completed").Count(&returnCount)
	if returnCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Đơn hàng đã có trả hàng — không thể hủy"})
		return
	}

	tx := config.DB.Begin()

	// Cộng lại tồn kho
	for _, item := range invoice.Items {
		tx.Model(&models.ProductBatch{}).Where("id = ?", item.BatchID).
			Update("quantity", gorm.Expr("quantity + ?", item.Quantity))
	}

	// Xóa nợ nếu là đơn mua nợ
	// FIX R8: Block cancel nếu khách đã trả nợ 1 phần (total_debt < FinalTotal)
	if invoice.PaymentMethod == "debt" && invoice.CustomerID != nil {
		var customer models.Customer
		if err := tx.First(&customer, *invoice.CustomerID).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tìm thấy khách hàng"})
			return
		}
		if customer.TotalDebt < invoice.FinalTotal {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Không thể hủy — khách đã trả nợ 1 phần. Tạo phiếu trả hàng thay thế.",
			})
			return
		}

		tx.Where("invoice_id = ?", invoice.ID).Delete(&models.Debt{})
		result := tx.Model(&models.Customer{}).
			Where("id = ? AND total_debt >= ?", *invoice.CustomerID, invoice.FinalTotal).
			Update("total_debt", gorm.Expr("total_debt - ?", invoice.FinalTotal))
		if result.RowsAffected == 0 {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "Nợ đã thay đổi, vui lòng thử lại"})
			return
		}
	}

	// Cập nhật shift
	tx.Model(&models.Shift{}).Where("id = ?", invoice.ShiftID).
		Updates(map[string]interface{}{
			"total_sales":    gorm.Expr("total_sales - ?", invoice.FinalTotal),
			"total_invoices": gorm.Expr("total_invoices - 1"),
		})

	invoice.Status = "cancelled"
	tx.Save(&invoice)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Đã hủy đơn hàng"})
}
