package models

import "time"

type ProductBatch struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	ProductID  uint       `json:"product_id" gorm:"not null;index"`
	Product    Product    `json:"-" gorm:"foreignKey:ProductID"`
	CostPrice  int        `json:"cost_price" gorm:"not null"`
	Quantity   int        `json:"quantity" gorm:"not null;default:0"`
	ExpiryDate *time.Time `json:"expiry_date"` // pointer = nullable (đồ gia dụng không có HSD)
	ReceivedAt time.Time  `json:"received_at" gorm:"not null"`
	CreatedAt  time.Time  `json:"created_at"`
}
