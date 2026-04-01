package handlers

import (
	"net/http"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

type CategoryRequest struct {
	Name string `json:"name" binding:"required"`
}

// ListCategories — lấy tất cả nhóm hàng
func ListCategories(c *gin.Context) {
	var categories []models.Category
	config.DB.Order("name").Find(&categories)
	c.JSON(http.StatusOK, categories)
}

// CreateCategory — thêm nhóm hàng mới
func CreateCategory(c *gin.Context) {
	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu tên nhóm hàng"})
		return
	}

	category := models.Category{Name: req.Name}
	if err := config.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Nhóm hàng đã tồn tại"})
		return
	}

	c.JSON(http.StatusCreated, category)
}

// UpdateCategory — sửa tên nhóm hàng
func UpdateCategory(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhóm hàng"})
		return
	}

	var req CategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu tên nhóm hàng"})
		return
	}

	category.Name = req.Name
	if err := config.DB.Save(&category).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Tên nhóm hàng đã tồn tại"})
		return
	}

	c.JSON(http.StatusOK, category)
}

// DeleteCategory — xóa nhóm hàng (chỉ khi không có sản phẩm nào thuộc nhóm)
func DeleteCategory(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var category models.Category
	if err := config.DB.First(&category, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhóm hàng"})
		return
	}

	// FIX R17: Dùng transaction cho COUNT+DELETE
	tx := config.DB.Begin()
	var count int64
	tx.Model(&models.Product{}).Where("category_id = ?", id).Count(&count)
	if count > 0 {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Không xóa được — còn sản phẩm trong nhóm này"})
		return
	}

	if err := tx.Delete(&category).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Không xóa được — có dữ liệu liên quan"})
		return
	}
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa nhóm hàng"})
}
