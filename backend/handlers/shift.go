package handlers

import (
	"net/http"
	"time"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

// OpenShift — mở ca bán hàng
func OpenShift(c *gin.Context) {
	userID, _ := c.Get("user_id")

	// Kiểm tra đã có ca đang mở chưa
	var existing models.Shift
	if err := config.DB.Where("user_id = ? AND closed_at IS NULL", userID).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Đang có ca mở rồi — đóng ca cũ trước"})
		return
	}

	var req struct {
		OpeningCash int `json:"opening_cash" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nhập số tiền đầu ca"})
		return
	}

	shift := models.Shift{
		UserID:      userID.(uint),
		OpeningCash: req.OpeningCash,
		OpenedAt:    time.Now(),
	}
	config.DB.Create(&shift)
	config.DB.Preload("User").First(&shift, shift.ID)

	c.JSON(http.StatusCreated, shift)
}

// CloseShift — đóng ca, đối soát tiền
func CloseShift(c *gin.Context) {
	id := c.Param("id")

	var shift models.Shift
	if err := config.DB.First(&shift, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy ca"})
		return
	}

	if shift.ClosedAt != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ca đã đóng rồi"})
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

	// Tính tiền mặt lý thuyết = opening + tổng tiền mặt bán được trong ca
	var cashSales int
	config.DB.Model(&models.Invoice{}).
		Where("shift_id = ? AND status = ?", shift.ID, "completed").
		Select("COALESCE(SUM(cash_amount), 0)").
		Scan(&cashSales)

	now := time.Now()
	expectedCash := shift.OpeningCash + cashSales
	difference := req.ClosingCash - expectedCash

	shift.ClosingCash = &req.ClosingCash
	shift.ExpectedCash = &expectedCash
	shift.Difference = &difference
	shift.Note = req.Note
	shift.ClosedAt = &now
	config.DB.Save(&shift)
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

// ListShifts — danh sách ca (admin xem tất cả)
func ListShifts(c *gin.Context) {
	var shifts []models.Shift
	config.DB.Preload("User").Order("opened_at DESC").Limit(50).Find(&shifts)
	c.JSON(http.StatusOK, shifts)
}
