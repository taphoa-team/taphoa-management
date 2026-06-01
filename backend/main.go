package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

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

	// CORS — cho phép frontend origins (local + tunnel)
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL != "" {
		allowedOrigins := []string{frontendURL, "http://localhost:3000", "http://localhost:3001"}
		r.Use(cors.New(cors.Config{
			AllowOrigins:     allowedOrigins,
			AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
			AllowHeaders:     []string{"Authorization", "Content-Type"},
			ExposeHeaders:    []string{"X-Total-Count"}, // cho browser đọc tổng số bản ghi (phân trang)
			AllowCredentials: true,
		}))
	}

	// Khởi động scheduler gửi email cảnh báo mỗi ngày 7h sáng (VN time)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	services.StartAlertScheduler(ctx)

	// Đăng ký routes
	routes.SetupRoutes(r)

	// Serve frontend tĩnh nếu có thư mục build
	// Dùng r.Static + r.NoRoute thay vì middleware tự viết → an toàn, không bị path traversal
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../frontend/build"
	}
	if info, err := os.Stat(staticDir); err == nil && info.IsDir() {
		r.Static("/static", staticDir+"/static")
		r.StaticFile("/favicon.ico", staticDir+"/favicon.ico")
		r.StaticFile("/manifest.json", staticDir+"/manifest.json")
		r.StaticFile("/robots.txt", staticDir+"/robots.txt")
		// SPA fallback — mọi route không match → trả index.html (trừ /api)
		r.NoRoute(func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api/") {
				c.JSON(404, gin.H{"error": "Not found"})
				return
			}
			c.File(staticDir + "/index.html")
		})
		log.Printf("Serving frontend from %s", staticDir)
	}

	// Chạy server với graceful shutdown
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}
	srv := &http.Server{Addr: ":" + port, Handler: r}
	go func() {
		log.Printf("Server running on http://localhost:%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server error:", err)
		}
	}()

	// Chờ tín hiệu tắt, cho request đang chạy hoàn thành (tối đa 5 giây)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")
	cancel() // Dừng alert scheduler trước
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}
	log.Println("Server stopped")
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
