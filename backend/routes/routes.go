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

			// === Categories ===
			auth.GET("/categories", handlers.ListCategories)
			auth.POST("/categories", handlers.CreateCategory)
			auth.PUT("/categories/:id", handlers.UpdateCategory)

			// === Products ===
			auth.GET("/products", handlers.ListProducts)
			auth.POST("/products", handlers.CreateProduct)
			auth.GET("/products/:id", handlers.GetProduct)
			auth.PUT("/products/:id", handlers.UpdateProduct)

			// Unit conversions
			auth.GET("/products/:id/conversions", handlers.ListUnitConversions)
			auth.POST("/products/:id/conversions", handlers.CreateUnitConversion)
			auth.PUT("/products/:id/conversions/:convId", handlers.UpdateUnitConversion)
			auth.DELETE("/products/:id/conversions/:convId", handlers.DeleteUnitConversion)

			// Batches
			auth.GET("/products/:id/batches", handlers.ListProductBatches)

			// === Suppliers ===
			auth.GET("/suppliers", handlers.ListSuppliers)
			auth.POST("/suppliers", handlers.CreateSupplier)
			auth.PUT("/suppliers/:id", handlers.UpdateSupplier)

			// === Purchase Orders ===
			auth.GET("/purchase-orders", handlers.ListPurchaseOrders)
			auth.POST("/purchase-orders", handlers.CreatePurchaseOrder)
			auth.GET("/purchase-orders/:id", handlers.GetPurchaseOrder)

			// === Shifts ===
			auth.GET("/shifts", handlers.ListShifts)
			auth.GET("/shifts/current", handlers.GetCurrentShift)
			auth.POST("/shifts/open", handlers.OpenShift)
			auth.POST("/shifts/:id/close", handlers.CloseShift)

			// === Invoices ===
			auth.GET("/invoices", handlers.ListInvoices)
			auth.POST("/invoices", handlers.CreateInvoice)
			auth.GET("/invoices/:id", handlers.GetInvoice)

			// === Returns ===
			auth.GET("/returns", handlers.ListReturns)
			auth.POST("/returns", handlers.CreateReturn)

			// === Alerts ===
			auth.GET("/alerts/expiry", handlers.ListExpiryAlerts)
			auth.GET("/alerts/low-stock", handlers.ListLowStockAlerts)
			auth.GET("/alerts/summary", handlers.GetAlertSummary)

			// === Inventory ===
			auth.GET("/inventory", handlers.ListInventory)

			// === Inventory Checks ===
			auth.GET("/inventory-checks", handlers.ListInventoryChecks)
			auth.POST("/inventory-checks", handlers.CreateInventoryCheck)
			auth.GET("/inventory-checks/:id", handlers.GetInventoryCheck)
			auth.PUT("/inventory-checks/:id/items", handlers.UpdateInventoryCheckItems)

			// === Waste ===
			auth.GET("/waste", handlers.ListWaste)
			auth.POST("/waste", handlers.CreateWaste)

			// === Customers ===
			auth.GET("/customers", handlers.ListCustomers)
			auth.POST("/customers", handlers.CreateCustomer)
			auth.GET("/customers/:id", handlers.GetCustomer)
			auth.PUT("/customers/:id", handlers.UpdateCustomer)
			auth.POST("/customers/:id/debt-payment", handlers.CreateDebtPayment)

			// === Debts ===
			auth.GET("/debts/summary", handlers.ListDebtSummary)

			// === Admin-only operations ===
			// FIX 2.9: Destructive operations chỉ admin
			admin := auth.Group("")
			admin.Use(middleware.AdminRequired())
			{
				admin.POST("/auth/register", handlers.Register)
				admin.DELETE("/categories/:id", handlers.DeleteCategory)
				admin.DELETE("/suppliers/:id", handlers.DeleteSupplier)
				admin.PATCH("/products/:id/deactivate", handlers.DeactivateProduct)
				admin.PATCH("/invoices/:id/cancel", handlers.CancelInvoice)
				admin.PATCH("/purchase-orders/:id/cancel", handlers.CancelPurchaseOrder)
				admin.POST("/inventory-checks/:id/confirm", handlers.ConfirmInventoryCheck)
			}
		}
	}
}
