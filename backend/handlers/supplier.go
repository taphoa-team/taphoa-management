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
	// FIX R10: Thêm pagination
	config.DB.Scopes(paginate(c)).Order("name").Find(&suppliers)
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
	// FIX 4.3: Check error khi create
	if err := config.DB.Create(&supplier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tạo được nhà cung cấp"})
		return
	}

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
	// FIX 4.3: Check error khi save
	if err := config.DB.Save(&supplier).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không cập nhật được nhà cung cấp"})
		return
	}

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

	// FIX R17: Dùng transaction cho COUNT+DELETE
	tx := config.DB.Begin()
	var count int64
	tx.Model(&models.PurchaseOrder{}).Where("supplier_id = ?", id).Count(&count)
	if count > 0 {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Không xóa được — đã có đơn nhập từ NCC này"})
		return
	}

	if err := tx.Delete(&supplier).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusConflict, gin.H{"error": "Không xóa được — có dữ liệu liên quan"})
		return
	}
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa nhà cung cấp"})
}
