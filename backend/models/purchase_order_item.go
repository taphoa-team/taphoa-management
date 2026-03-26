package models

type PurchaseOrderItem struct {
	ID              uint    `json:"id" gorm:"primaryKey"`
	PurchaseOrderID uint    `json:"purchase_order_id" gorm:"not null;index"`
	ProductID       uint    `json:"product_id" gorm:"not null"`
	Product         Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	Quantity        int     `json:"quantity" gorm:"not null"`
	CostPrice       int     `json:"cost_price" gorm:"not null"`
}
