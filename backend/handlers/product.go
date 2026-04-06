package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"
	"taphoa-management/backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// --- Request structs ---

type ProductRequest struct {
	Barcode     *string `json:"barcode"`
	Name        string  `json:"name" binding:"required"`
	CategoryID  uint    `json:"category_id" binding:"required"`
	SellPrice   int     `json:"sell_price" binding:"required,gt=0"`
	MinQuantity int     `json:"min_quantity"`
	HasExpiry   bool    `json:"has_expiry"`
	Unit        string  `json:"unit" binding:"required"`
}

// --- Helpers ---

// generateSKU tạo mã SKU tự động dựa trên MAX hiện tại (an toàn hơn COUNT)
func generateSKU(tx *gorm.DB) string {
	var maxSKU string
	tx.Model(&models.Product{}).Select("COALESCE(MAX(sku), 'TH0000')").Scan(&maxSKU)
	var num int
	fmt.Sscanf(maxSKU, "TH%d", &num)
	return fmt.Sprintf("TH%04d", num+1)
}

// getStockMap delegates to services.GetStockMap — single source of truth
func getStockMap(db *gorm.DB, productIDs ...[]uint) map[uint]int {
	return services.GetStockMap(db, productIDs...)
}

// --- Handlers ---

// ListProducts — danh sách sản phẩm, hỗ trợ tìm kiếm + lọc
func ListProducts(c *gin.Context) {
	var products []models.Product
	query := config.DB.Preload("Category").Where("is_active = ?", true)

	// Tìm kiếm theo tên, SKU, hoặc barcode
	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("name ILIKE ? OR sku ILIKE ? OR barcode ILIKE ?", like, like, like)
	}

	// FIX R18: Validate category_id là số
	if categoryID := c.Query("category_id"); categoryID != "" {
		if _, err := strconv.ParseUint(categoryID, 10, 32); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "category_id không hợp lệ"})
			return
		}
		query = query.Where("category_id = ?", categoryID)
	}

	query.Scopes(paginate(c)).Order("name").Find(&products)

	// FIX R5: Chỉ fetch stock cho products trong trang hiện tại
	var productIDs []uint
	for _, p := range products {
		productIDs = append(productIDs, p.ID)
	}
	stockMap := getStockMap(config.DB, productIDs)

	// Trả về kèm tồn kho
	type ProductWithStock struct {
		models.Product
		Stock int `json:"stock"`
	}
	var result []ProductWithStock
	for _, p := range products {
		result = append(result, ProductWithStock{
			Product: p,
			Stock:   stockMap[p.ID],
		})
	}

	c.JSON(http.StatusOK, result)
}

// GetProduct — chi tiết 1 sản phẩm kèm batches
func GetProduct(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var product models.Product
	if err := config.DB.Preload("Category").Preload("Batches", "quantity > 0").Preload("UnitConversions").First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy sản phẩm"})
		return
	}

	// Tính tồn kho tổng
	var stock int
	for _, b := range product.Batches {
		stock += b.Quantity
	}

	c.JSON(http.StatusOK, gin.H{
		"product": product,
		"stock":   stock,
	})
}

// CreateProduct — thêm sản phẩm mới, tự sinh SKU
func CreateProduct(c *gin.Context) {
	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ: " + err.Error()})
		return
	}

	if req.MinQuantity == 0 {
		req.MinQuantity = 5
	}

	// FIX 1.3 + R1: Retry on duplicate SKU, trả lỗi nếu 3 lần đều fail
	var product models.Product
	var created bool
	for retries := 0; retries < 3; retries++ {
		product = models.Product{
			SKU:         generateSKU(config.DB),
			Barcode:     req.Barcode,
			Name:        req.Name,
			CategoryID:  req.CategoryID,
			SellPrice:   req.SellPrice,
			MinQuantity: req.MinQuantity,
			HasExpiry:   req.HasExpiry,
			Unit:        req.Unit,
			IsActive:    true,
		}
		if err := config.DB.Create(&product).Error; err != nil {
			if strings.Contains(err.Error(), "duplicate") {
				continue
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tạo được sản phẩm"})
			return
		}
		created = true
		break
	}
	if !created {
		c.JSON(http.StatusConflict, gin.H{"error": "Không tạo được SKU, vui lòng thử lại"})
		return
	}

	// Load category để trả về
	config.DB.Preload("Category").First(&product, product.ID)

	c.JSON(http.StatusCreated, product)
}

// UpdateProduct — sửa thông tin sản phẩm
func UpdateProduct(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	var product models.Product
	if err := config.DB.First(&product, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy sản phẩm"})
		return
	}

	var req ProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ: " + err.Error()})
		return
	}

	// Ghi lịch sử giá nếu giá thay đổi
	if product.SellPrice != req.SellPrice {
		userID, _ := c.Get("user_id")
		priceHistory := models.PriceHistory{
			ProductID: product.ID,
			OldPrice:  product.SellPrice,
			NewPrice:  req.SellPrice,
			ChangedBy: userID.(uint),
		}
		config.DB.Create(&priceHistory)
	}

	product.Barcode = req.Barcode
	product.Name = req.Name
	product.CategoryID = req.CategoryID
	product.SellPrice = req.SellPrice
	product.MinQuantity = req.MinQuantity
	product.HasExpiry = req.HasExpiry
	product.Unit = req.Unit

	// FIX 4.3: Check error khi save
	if err := config.DB.Save(&product).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không cập nhật được sản phẩm"})
		return
	}
	config.DB.Preload("Category").First(&product, product.ID)

	c.JSON(http.StatusOK, product)
}

// DeactivateProduct — ngừng bán sản phẩm (không xóa)
func DeactivateProduct(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}

	result := config.DB.Model(&models.Product{}).Where("id = ?", id).Update("is_active", false)
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy sản phẩm"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Đã ngừng bán sản phẩm"})
}

// --- Unit Conversions ---

type UnitConversionRequest struct {
	FromUnit       string `json:"from_unit" binding:"required"`
	ToUnit         string `json:"to_unit" binding:"required"`
	ConversionRate int    `json:"conversion_rate" binding:"required"`
}

// ListUnitConversions — danh sách quy đổi đơn vị của 1 sản phẩm
func ListUnitConversions(c *gin.Context) {
	productID, ok := parseID(c)
	if !ok {
		return
	}
	var conversions []models.UnitConversion
	config.DB.Where("product_id = ?", productID).Find(&conversions)
	c.JSON(http.StatusOK, conversions)
}

// CreateUnitConversion — thêm quy đổi đơn vị
func CreateUnitConversion(c *gin.Context) {
	productID, ok := parseID(c)
	if !ok {
		return
	}

	var product models.Product
	if err := config.DB.First(&product, productID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy sản phẩm"})
		return
	}

	var req UnitConversionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}

	conversion := models.UnitConversion{
		ProductID:      product.ID,
		FromUnit:       req.FromUnit,
		ToUnit:         req.ToUnit,
		ConversionRate: req.ConversionRate,
	}
	// FIX 4.3: Check error khi create
	if err := config.DB.Create(&conversion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không tạo được quy đổi"})
		return
	}

	c.JSON(http.StatusCreated, conversion)
}

// UpdateUnitConversion — sửa quy đổi
// FIX R7: Validate convId là số
func UpdateUnitConversion(c *gin.Context) {
	cid, err := strconv.ParseUint(c.Param("convId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}
	convID := uint(cid)

	var conversion models.UnitConversion
	if err := config.DB.First(&conversion, convID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy quy đổi"})
		return
	}

	var req UnitConversionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dữ liệu không hợp lệ"})
		return
	}

	conversion.FromUnit = req.FromUnit
	conversion.ToUnit = req.ToUnit
	conversion.ConversionRate = req.ConversionRate
	config.DB.Save(&conversion)

	c.JSON(http.StatusOK, conversion)
}

// DeleteUnitConversion — xóa quy đổi
// FIX R7: Validate convId là số
func DeleteUnitConversion(c *gin.Context) {
	cid, err := strconv.ParseUint(c.Param("convId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}
	convID := uint(cid)

	var conversion models.UnitConversion
	if err := config.DB.First(&conversion, convID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy quy đổi"})
		return
	}

	config.DB.Delete(&conversion)
	c.JSON(http.StatusOK, gin.H{"message": "Đã xóa quy đổi"})
}

// --- Inventory view ---

// ListInventory — xem tồn kho tất cả SP, cảnh báo sắp hết
func ListInventory(c *gin.Context) {
	var products []models.Product
	config.DB.Preload("Category").Where("is_active = ?", true).Scopes(paginate(c)).Order("name").Find(&products)

	// FIX R5: Chỉ fetch stock cho products trong trang hiện tại
	var pIDs []uint
	for _, p := range products {
		pIDs = append(pIDs, p.ID)
	}
	stockMap := getStockMap(config.DB, pIDs)

	type InventoryItem struct {
		models.Product
		Stock   int    `json:"stock"`
		Warning string `json:"warning"` // "low" nếu dưới min_quantity, "" nếu ok
	}

	var result []InventoryItem
	for _, p := range products {
		stock := stockMap[p.ID]
		warning := ""
		if stock <= p.MinQuantity {
			warning = "low"
		}
		if stock == 0 {
			warning = "out"
		}
		result = append(result, InventoryItem{
			Product: p,
			Stock:   stock,
			Warning: warning,
		})
	}

	c.JSON(http.StatusOK, result)
}

// ListProductBatches — xem lô hàng của 1 SP
func ListProductBatches(c *gin.Context) {
	productID, ok := parseID(c)
	if !ok {
		return
	}
	var batches []models.ProductBatch
	config.DB.Where("product_id = ? AND quantity > 0", productID).
		Order("COALESCE(expiry_date, '9999-12-31') ASC, received_at ASC").
		Find(&batches)
	c.JSON(http.StatusOK, batches)
}

// --- Helper: convert unit to base quantity ---

func convertToBaseQuantity(db *gorm.DB, productID uint, unit string, qty int) (int, error) {
	var product models.Product
	if err := db.First(&product, productID).Error; err != nil {
		return 0, fmt.Errorf("không tìm thấy sản phẩm")
	}

	// Nếu đã là đơn vị gốc → trả về nguyên
	if unit == product.Unit {
		return qty, nil
	}

	// Tìm quy đổi
	var conv models.UnitConversion
	if err := db.Where("product_id = ? AND from_unit = ?", productID, unit).First(&conv).Error; err != nil {
		return 0, fmt.Errorf("không tìm thấy quy đổi từ %s", unit)
	}

	return qty * conv.ConversionRate, nil
}
