package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// FIX 3.4: Pagination helper — dùng ?page=1&limit=20
func paginate(c *gin.Context) func(db *gorm.DB) *gorm.DB {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	offset := (page - 1) * limit
	return func(db *gorm.DB) *gorm.DB {
		return db.Offset(offset).Limit(limit)
	}
}

// FIX 4.2: Parse route param ID, trả 400 nếu không phải số
func parseID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return 0, false
	}
	return uint(id), true
}

// formatVNDBackend — format tiền VND cho backend messages
func formatVNDBackend(amount int) string {
	s := strconv.Itoa(amount)
	var b strings.Builder
	b.Grow(len(s) + len(s)/3 + 2)
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte('.')
		}
		b.WriteRune(c)
	}
	b.WriteString("đ")
	return b.String()
}
