package handlers

import (
	"net/http"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"

	"github.com/gin-gonic/gin"
)

type SupplierRequest struct {
	Name    string  `json:"name" binding:"required"`
	Phone   *string `json:"phone"`
	Address *string `json:"address"`
	Note    *string `json:"note"`
}

func ListSuppliers(c *gin.Context) {
	var suppliers []models.Supplier
	config.DB.Order("name").Find(&suppliers)
	c.JSON(http.StatusOK, suppliers)
}

func CreateSupplier(c *gin.Context) {
	var req SupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Thiếu tên nhà cung cấp"})
		return
	}

	supplier := models.Supplier{
		Name:    req.Name,
		Phone:   req.Phone,
		Address: req.Address,
		Note:    req.Note,
	}
	config.DB.Create(&supplier)

	c.JSON(http.StatusCreated, supplier)
}

func UpdateSupplier(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var supplier models.Supplier
	if err := config.DB.First(&supplier, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhà cung cấp"})
		return
	}

	var req SupplierRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}

	supplier.Name = req.Name
	supplier.Phone = req.Phone
	supplier.Address = req.Address
	supplier.Note = req.Note
	config.DB.Save(&supplier)

	c.JSON(http.StatusOK, supplier)
}

func DeleteSupplier(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var supplier models.Supplier
	if err := config.DB.First(&supplier, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy nhà cung cấp"})
		return
	}

	// Kiểm tra có đơn nhập nào từ NCC này không
	var count int64
	config.DB.Model(&models.PurchaseOrder{}).Where("supplier_id = ?", id).Count(&count)
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Không xóa được — đã có đơn nhập từ NCC này"})
		return
	}

	config.DB.Delete(&supplier)
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa nhà cung cấp"})
}
