package main

import (
	"log"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"
	"taphoa-management/backend/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
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

	// Seed admin mặc định — chỉ tạo nếu chưa có
	seedAdmin()

	// Khởi tạo router
	r := gin.Default()

	// FIX 2.6: CORS cho frontend
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3001"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	// Đăng ký routes
	routes.SetupRoutes(r)

	// Chạy server trên port 8082
	port := "8082"
	log.Println("Server running on http://localhost:" + port)
	r.Run(":" + port)
}

func seedAdmin() {
	var count int64
	config.DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		return // đã có user → không seed
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	admin := models.User{
		Name:     "Admin",
		Phone:    "0999999999",
		Password: string(hashedPassword),
		Role:     "admin",
	}
	config.DB.Create(&admin)
	log.Println("Seeded default admin: 0999999999 / admin123")
}
