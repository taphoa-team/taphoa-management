package handlers

import (
	"net/http"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CustomerRequest struct {
	Name    string  `json:"name" binding:"required"`
	Phone   *string `json:"phone"`
	Address *string `json:"address"`
}

func ListCustomers(c *gin.Context) {
	var customers []models.Customer

	query := config.DB.Order("name")
	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ? OR phone ILIKE ?", like, like)
	}

	query.Scopes(paginate(c)).Find(&customers)
	c.JSON(http.StatusOK, customers)
}

func GetCustomer(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var customer models.Customer
	if err := config.DB.First(&customer, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy khách hàng"})
		return
	}

	// Lịch sử mua hàng
	var invoices []models.Invoice
	config.DB.Where("customer_id = ?", id).Order("created_at DESC").Limit(20).Find(&invoices)

	// Lịch sử công nợ
	var debts []models.Debt
	config.DB.Where("customer_id = ?", id).Order("created_at DESC").Find(&debts)

	c.JSON(http.StatusOK, gin.H{
		"customer": customer,
		"invoices": invoices,
		"debts":    debts,
	})
}

func CreateCustomer(c *gin.Context) {
	var req CustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu tên khách hàng"})
		return
	}

	customer := models.Customer{
		Name:    req.Name,
		Phone:   req.Phone,
		Address: req.Address,
	}
	config.DB.Create(&customer)

	c.JSON(http.StatusCreated, customer)
}

func UpdateCustomer(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var customer models.Customer
	if err := config.DB.First(&customer, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy khách hàng"})
		return
	}

	var req CustomerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}

	customer.Name = req.Name
	customer.Phone = req.Phone
	customer.Address = req.Address
	config.DB.Save(&customer)

	c.JSON(http.StatusOK, customer)
}

// --- Debts ---

type DebtPaymentRequest struct {
	Amount int     `json:"amount" binding:"required,gt=0"`
	Note   *string `json:"note"`
}

// CreateDebtPayment — ghi nhận trả nợ
// FIX 2.10: Atomic read-modify-write cho TotalDebt
func CreateDebtPayment(c *gin.Context) {
	customerID, ok := parseID(c)
	if !ok {
		return
	}

	var customer models.Customer
	if err := config.DB.First(&customer, customerID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy khách hàng"})
		return
	}

	var req DebtPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nhập số tiền trả nợ"})
		return
	}

	if req.Amount > customer.TotalDebt {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Số tiền trả vượt quá tổng nợ"})
		return
	}

	tx := config.DB.Begin()

	debt := models.Debt{
		CustomerID: customer.ID,
		Type:       "payment",
		Amount:     req.Amount,
		Note:       req.Note,
	}
	tx.Create(&debt)

	// FIX 2.10: Atomic update + check RowsAffected
	result := tx.Model(&models.Customer{}).Where("id = ? AND total_debt >= ?", customer.ID, req.Amount).
		Update("total_debt", gorm.Expr("total_debt - ?", req.Amount))
	if result.RowsAffected == 0 {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Nợ đã thay đổi, vui lòng thử lại"})
		return
	}

	tx.Commit()

	// Reload
	config.DB.First(&customer, customer.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Đã ghi nhận trả nợ",
		"payment":    debt,
		"total_debt": customer.TotalDebt,
	})
}

// ListDebtSummary — tất cả khách đang nợ
func ListDebtSummary(c *gin.Context) {
	var customers []models.Customer
	config.DB.Where("total_debt > 0").Order("total_debt DESC").Find(&customers)
	c.JSON(http.StatusOK, customers)
}
