package main

import (
	"log"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"
	"taphoa-management/backend/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// Kết nối database
	config.ConnectDatabase()

	// Auto migrate — tự tạo bảng từ models
	err := config.DB.AutoMigrate(
		// Phase 1
		&models.User{},
		&models.Category{},
		&models.Product{},
		&models.ProductBatch{},
		&models.Supplier{},
		&models.UnitConversion{},
		&models.Invoice{},
		&models.InvoiceItem{},
		&models.PurchaseOrder{},
		&models.PurchaseOrderItem{},
		&models.Return{},
		&models.ReturnItem{},
		&models.Shift{},
		&models.InventoryCheck{},
		&models.InventoryCheckItem{},
		&models.WasteRecord{},
		// Phase 2
		&models.Customer{},
		&models.Debt{},
		// Phase 4
		&models.PriceHistory{},
		&models.Discount{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
	log.Println("Database migrated")

	// Khởi tạo router
	r := gin.Default()

	// Đăng ký routes
	routes.SetupRoutes(r)

	// Chạy server trên port 8080
	port := "8082"
	log.Println("Server running on http://localhost:" + port)
	r.Run(":" + port)
}
