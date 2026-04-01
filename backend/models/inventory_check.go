package models

import "time"

type InventoryCheck struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	UserID      uint       `json:"user_id" gorm:"not null"`
	User        User       `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Status      string     `json:"status" gorm:"size:20;default:draft"` // draft / completed
	Note        *string    `json:"note"`
	CreatedAt   time.Time  `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at"`

	// Quan hệ
	Items []InventoryCheckItem `json:"items,omitempty" gorm:"foreignKey:CheckID"`
}

type InventoryCheckItem struct {
	ID             uint    `json:"id" gorm:"primaryKey"`
	CheckID        uint    `json:"check_id" gorm:"not null;index:idx_check_product,priority:1"`
	ProductID      uint    `json:"product_id" gorm:"not null;index:idx_check_product,priority:2"`
	Product        Product `json:"product,omitempty" gorm:"foreignKey:ProductID"`
	SystemQuantity int     `json:"system_quantity" gorm:"not null"` // số trên hệ thống
	ActualQuantity int     `json:"actual_quantity" gorm:"not null"` // số đếm thực tế
	Difference     int     `json:"difference" gorm:"not null"`      // actual - system
	Note           *string `json:"note"`
}
