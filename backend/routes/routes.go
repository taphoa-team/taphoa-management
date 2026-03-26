package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Health check — kiểm tra server có chạy không
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Taphoa Management API is running",
		})
	})

	// API routes sẽ thêm dần ở đây
	// api := r.Group("/api")
	// {
	//     // products
	//     // invoices
	//     // ...
	// }
}
