package models

type PurchaseOrderItem struct {
	ID              uint    `json:"id" gorm:"primaryKey"`
	PurchaseOrderID uint    `json:"purchase_order_id" gorm:"not null;index"`
	ProductID       uint    `json:"product_id" gorm:"not null"`
	Product         Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Quantity        int     `json:"quantity" gorm:"not null"`
	Unit            string  `json:"unit" gorm:"size:20;not null;default:''"` // đơn vị gốc khi nhập
	CostPrice       int     `json:"cost_price" gorm:"not null"`
	BatchID         uint    `json:"batch_id" gorm:"not null;default:0"` // lô hàng đã tạo
}
