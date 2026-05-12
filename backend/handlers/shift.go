package handlers

import (
	"net/http"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

// gorm used in other files in this package


// OpenShift — mở ca bán hàng
func OpenShift(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req struct {
		CashierName string `json:"cashier_name" binding:"required"`
		OpeningCash int    `json:"opening_cash" binding:"min=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nhập tên nhân viên và số tiền đầu ca"})
		return
	}

	// FIX R14: Dùng SELECT FOR UPDATE để tránh race condition tạo 2 ca mở
	tx := config.DB.Begin()
	var existing models.Shift
	if err := tx.Raw("SELECT id FROM shifts WHERE user_id = ? AND closed_at IS NULL FOR UPDATE", userID).
		Scan(&existing).Error; err == nil && existing.ID > 0 {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Đang có ca mở rồi — đóng ca cũ trước"})
		return
	}

	shift := models.Shift{
		UserID:      userID.(uint),
		CashierName: req.CashierName,
		OpeningCash: req.OpeningCash,
		OpenedAt:    time.Now(),
	}
	// FIX 4.3: Check error khi create
	if err := tx.Create(&shift).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không mở được ca"})
		return
	}
	tx.Commit()

	config.DB.Preload("User").First(&shift, shift.ID)
	c.JSON(http.StatusCreated, shift)
}

// CloseShift — đóng ca, đối soát tiền
// FIX 2.2: Kiểm tra shift thuộc user hiện tại hoặc admin
func CloseShift(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var shift models.Shift
	if err := config.DB.First(&shift, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy ca"})
		return
	}

	if shift.ClosedAt != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ca đã đóng rồi"})
		return
	}

	// FIX 2.2: Chỉ owner hoặc admin mới đóng được
	userID, _ := c.Get("user_id")
	role, _ := c.Get("role")
	if shift.UserID != userID.(uint) && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Chỉ được đóng ca của chính mình"})
		return
	}

	var req struct {
		ClosingCash int     `json:"closing_cash" binding:"required"`
		Note        *string `json:"note"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nhập số tiền cuối ca"})
		return
	}

	// Tính tiền mặt lý thuyết = opening + tổng tiền mặt bán được - cash refunds
	var cashSales int
	config.DB.Model(&models.Invoice{}).
		Where("shift_id = ? AND status = ?", shift.ID, "completed").
		Select("COALESCE(SUM(cash_amount), 0)").
		Scan(&cashSales)

	// FIX N5: Trừ cash refunds từ returns trong ca
	var cashRefunds int
	config.DB.Model(&models.Return{}).
		Joins("JOIN invoices ON invoices.id = returns.invoice_id").
		Where("invoices.shift_id = ? AND invoices.payment_method IN ('cash','mixed')", shift.ID).
		Select("COALESCE(SUM(returns.total_refund), 0)").Scan(&cashRefunds)

	now := time.Now()
	expectedCash := shift.OpeningCash + cashSales - cashRefunds
	difference := req.ClosingCash - expectedCash

	shift.ClosingCash = &req.ClosingCash
	shift.ExpectedCash = &expectedCash
	shift.Difference = &difference
	shift.Note = req.Note
	shift.ClosedAt = &now
	// FIX 4.3: Check error khi save
	if err := config.DB.Save(&shift).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không đóng được ca"})
		return
	}
	config.DB.Preload("User").First(&shift, shift.ID)

	c.JSON(http.StatusOK, shift)
}

// GetCurrentShift — lấy ca đang mở của user hiện tại
func GetCurrentShift(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var shift models.Shift
	if err := config.DB.Preload("User").Where("user_id = ? AND closed_at IS NULL", userID).First(&shift).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Chưa mở ca"})
		return
	}

	c.JSON(http.StatusOK, shift)
}

// ListShifts — admin xem tất cả, staff chỉ xem ca của mình
func ListShifts(c *gin.Context) {
	role, _ := c.Get("role")
	query := config.DB.Preload("User").Scopes(paginate(c)).Order("opened_at DESC")
	if role != "admin" {
		userID, _ := c.Get("user_id")
		query = query.Where("user_id = ?", userID)
	}
	var shifts []models.Shift
	query.Find(&shifts)
	c.JSON(http.StatusOK, shifts)
}

