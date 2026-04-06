package main

import (
	"context"
	"log"
	"os"
	"strings"

	"taphoa-management/backend/config"
	"taphoa-management/backend/models"
	"taphoa-management/backend/routes"
	"taphoa-management/backend/services"

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

	// FIX 2.6 + R12: CORS cho frontend, đọc từ env
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3001"
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	// Khởi động scheduler gửi email cảnh báo mỗi ngày 7h sáng (VN time)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	services.StartAlertScheduler(ctx)

	// Đăng ký routes
	routes.SetupRoutes(r)

	// Serve frontend tĩnh nếu có thư mục build
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../frontend/build"
	}
	if info, err := os.Stat(staticDir); err == nil && info.IsDir() {
		r.Use(func(c *gin.Context) {
			path := c.Request.URL.Path
			// Bỏ qua API routes
			if strings.HasPrefix(path, "/api") || path == "/health" {
				c.Next()
				return
			}
			// Thử serve file tĩnh
			filePath := staticDir + path
			if _, err := os.Stat(filePath); err == nil {
				c.File(filePath)
				c.Abort()
				return
			}
			// Fallback → index.html (SPA routing)
			c.File(staticDir + "/index.html")
			c.Abort()
		})
		log.Printf("Serving frontend from %s", staticDir)
	}

	// Chạy server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	log.Printf("Server running on http://localhost:%s", port)
	r.Run(":" + port)
}

func seedAdmin() {
	var count int64
	config.DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		return // đã có user → không seed
	}

	// FIX 5.2: Handle bcrypt error
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatal("Failed to hash admin password:", err)
	}
	admin := models.User{
		Name:     "Admin",
		Phone:    "0999999999",
		Password: string(hashedPassword),
		Role:     "admin",
	}
	config.DB.Create(&admin)
	// FIX 3.5: Không log password
	log.Println("Seeded default admin account (phone: 0999999999)")
}
