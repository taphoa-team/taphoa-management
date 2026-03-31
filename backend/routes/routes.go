package routes

import (
	"net/http"

	"taphoa-management/backend/handlers"
	"taphoa-management/backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Taphoa Management API is running",
		})
	})

	api := r.Group("/api")
	{
		// === Auth (public) ===
		api.POST("/auth/login", handlers.Login)

		// === Tất cả route bên dưới cần đăng nhập ===
		auth := api.Group("")
		auth.Use(middleware.AuthRequired())
		{
			// Auth
			auth.GET("/auth/me", handlers.GetMe)

			// Admin only
			admin := auth.Group("")
			admin.Use(middleware.AdminRequired())
			{
				admin.POST("/auth/register", handlers.Register)
			}

			// === Categories ===
			categories := auth.Group("/categories")
			{
				categories.GET("", handlers.ListCategories)
				categories.POST("", handlers.CreateCategory)
				categories.PUT("/:id", handlers.UpdateCategory)
				categories.DELETE("/:id", handlers.DeleteCategory)
			}

			// === Products ===
			products := auth.Group("/products")
			{
				products.GET("", handlers.ListProducts)
				products.POST("", handlers.CreateProduct)
				products.GET("/:id", handlers.GetProduct)
				products.PUT("/:id", handlers.UpdateProduct)
				products.PATCH("/:id/deactivate", handlers.DeactivateProduct)

				// Unit conversions (nested under product)
				products.GET("/:id/conversions", handlers.ListUnitConversions)
				products.POST("/:id/conversions", handlers.CreateUnitConversion)
				products.PUT("/:id/conversions/:convId", handlers.UpdateUnitConversion)
				products.DELETE("/:id/conversions/:convId", handlers.DeleteUnitConversion)

				// Batches
				products.GET("/:id/batches", handlers.ListProductBatches)
			}

			// === Suppliers ===
			suppliers := auth.Group("/suppliers")
			{
				suppliers.GET("", handlers.ListSuppliers)
				suppliers.POST("", handlers.CreateSupplier)
				suppliers.PUT("/:id", handlers.UpdateSupplier)
				suppliers.DELETE("/:id", handlers.DeleteSupplier)
			}

			// === Purchase Orders (Nhập hàng) ===
			po := auth.Group("/purchase-orders")
			{
				po.GET("", handlers.ListPurchaseOrders)
				po.POST("", handlers.CreatePurchaseOrder)
				po.GET("/:id", handlers.GetPurchaseOrder)
				po.PATCH("/:id/cancel", handlers.CancelPurchaseOrder)
			}

			// === Shifts (Ca bán hàng) ===
			shifts := auth.Group("/shifts")
			{
				shifts.GET("", handlers.ListShifts)
				shifts.GET("/current", handlers.GetCurrentShift)
				shifts.POST("/open", handlers.OpenShift)
				shifts.POST("/:id/close", handlers.CloseShift)
			}

			// === Invoices (Bán hàng) ===
			invoices := auth.Group("/invoices")
			{
				invoices.GET("", handlers.ListInvoices)
				invoices.POST("", handlers.CreateInvoice)
				invoices.GET("/:id", handlers.GetInvoice)
				invoices.PATCH("/:id/cancel", handlers.CancelInvoice)
			}

			// === Returns (Trả hàng) ===
			returns := auth.Group("/returns")
			{
				returns.GET("", handlers.ListReturns)
				returns.POST("", handlers.CreateReturn)
			}

			// === Inventory (Tồn kho) ===
			auth.GET("/inventory", handlers.ListInventory)

			// === Inventory Checks (Kiểm kê) ===
			checks := auth.Group("/inventory-checks")
			{
				checks.GET("", handlers.ListInventoryChecks)
				checks.POST("", handlers.CreateInventoryCheck)
				checks.GET("/:id", handlers.GetInventoryCheck)
				checks.PUT("/:id/items", handlers.UpdateInventoryCheckItems)
				checks.POST("/:id/confirm", handlers.ConfirmInventoryCheck)
			}

			// === Waste (Xuất hủy) ===
			waste := auth.Group("/waste")
			{
				waste.GET("", handlers.ListWaste)
				waste.POST("", handlers.CreateWaste)
			}

			// === Customers (Khách hàng) ===
			customers := auth.Group("/customers")
			{
				customers.GET("", handlers.ListCustomers)
				customers.POST("", handlers.CreateCustomer)
				customers.GET("/:id", handlers.GetCustomer)
				customers.PUT("/:id", handlers.UpdateCustomer)
				customers.POST("/:id/debt-payment", handlers.CreateDebtPayment)
			}

			// === Debts (Công nợ) ===
			auth.GET("/debts/summary", handlers.ListDebtSummary)
		}
	}
}
