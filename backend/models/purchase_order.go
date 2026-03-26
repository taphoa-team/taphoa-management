package models

import "time"

type PurchaseOrder struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	UserID     uint      `json:"user_id" gorm:"not null"`
	User       User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	SupplierID uint      `json:"supplier_id" gorm:"not null"`
	Supplier   Supplier  `json:"supplier,omitempty" gorm:"foreignKey:SupplierID"`
	Total      int       `json:"total" gorm:"not null"`
	Paid       int       `json:"paid" gorm:"default:0"` // số tiền đã trả NCC
	Status     string    `json:"status" gorm:"size:20;default:completed"`
	Note       *string   `json:"note"`
	CreatedAt  time.Time `json:"created_at"`

	// Quan hệ
	Items []PurchaseOrderItem `json:"items,omitempty" gorm:"foreignKey:PurchaseOrderID"`
}
